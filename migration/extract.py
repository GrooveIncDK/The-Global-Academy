#!/usr/bin/env python3
"""
Extracts content from the old WordPress export (imported into a local MySQL/MariaDB
database) into clean JSON files the migrate.mjs script can feed into Payload.

Images are deliberately NOT downloaded here — per the "migrate data now, images later"
decision, every image field is captured as a *SourceUrl string (the original WordPress
attachment URL) so a later pass can fetch the binaries and attach them properly.

Usage:
    python3 extract.py --db wp_import --out extracted/

Requires: pip install pymysql
"""
import argparse
import json
import re
import sys
from pathlib import Path

import pymysql
import pymysql.cursors

TABLE_PREFIX = "v8mMsMNGP_"  # table prefix used in the source dump; override with --prefix if needed

# ---------------------------------------------------------------------------
# A tiny, hand-rolled PHP unserialize() — just enough for the ACF array shapes
# used in this export (flat arrays of strings/ints). Not a general-purpose
# implementation.
# ---------------------------------------------------------------------------

def php_unserialize(data: str):
    if not data:
        return None
    pos = 0

    def read_until(ch):
        nonlocal pos
        start = pos
        pos = data.index(ch, pos)
        return data[start:pos]

    def parse():
        nonlocal pos
        kind = data[pos]
        if kind == "N":  # null
            pos += 2
            return None
        if kind in ("i", "d", "b"):  # int, float, bool
            pos += 2
            val = read_until(";")
            pos += 1
            if kind == "i":
                return int(val)
            if kind == "d":
                return float(val)
            return val == "1"
        if kind == "s":  # string: s:LEN:"VALUE";
            pos += 2
            length = int(read_until(":"))
            pos += 2  # skip ':"'
            # PHP string length is in bytes; data is a python str decoded as utf-8,
            # so re-encode the slice to count bytes correctly for multi-byte chars.
            raw = data.encode("utf-8")
            # locate byte offset of pos
            byte_pos = len(data[:pos].encode("utf-8"))
            val_bytes = raw[byte_pos : byte_pos + length]
            val = val_bytes.decode("utf-8", errors="replace")
            pos += len(val)
            pos += 2  # skip '";'
            return val
        if kind == "a":  # array: a:COUNT:{...}
            pos += 2
            count = int(read_until(":"))
            pos += 2  # skip ':{'
            items = []
            result_is_list = True
            result_dict = {}
            for _ in range(count):
                key = parse()
                val = parse()
                result_dict[key] = val
                if key != len(items):
                    result_is_list = False
                items.append(val)
            pos += 1  # skip '}'
            return items if result_is_list else result_dict
        raise ValueError(f"Unsupported PHP serialize token {kind!r} at {pos} in {data[:80]!r}")

    try:
        return parse()
    except Exception as exc:  # defensive — legacy data has some genuinely malformed rows
        print(f"  [warn] php_unserialize failed on {data[:80]!r}: {exc}", file=sys.stderr)
        return None


COUNTRY_RE = re.compile(r"^[A-Z]{2}$")


def clean_country(value):
    if value and COUNTRY_RE.match(value.strip()):
        return value.strip()
    return None


class WPDump:
    def __init__(self, db, host="127.0.0.1", user="root", password="", prefix=TABLE_PREFIX, unix_socket=None):
        self.conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=db,
            cursorclass=pymysql.cursors.DictCursor,
            charset="utf8mb4",
            unix_socket=unix_socket,
        )
        self.p = prefix

    def q(self, sql, params=None):
        with self.conn.cursor() as cur:
            cur.execute(sql.format(p=self.p), params or ())
            return cur.fetchall()

    def postmeta(self, post_id):
        rows = self.q(
            "SELECT meta_key, meta_value FROM {p}postmeta WHERE post_id=%s AND meta_key NOT LIKE '\\_%%'",
            (post_id,),
        )
        return {r["meta_key"]: r["meta_value"] for r in rows}

    def postmeta_all(self, post_id):
        """Unfiltered postmeta, including underscore-prefixed keys. Needed for job_listing
        posts: WP Job Manager (unlike ACF) stores its real, canonical field values with a
        leading underscore (e.g. _company_name, _job_location) — those are NOT ACF's usual
        internal "which field key" shadow rows, they're the actual data."""
        rows = self.q("SELECT meta_key, meta_value FROM {p}postmeta WHERE post_id=%s", (post_id,))
        return {r["meta_key"]: r["meta_value"] for r in rows}

    def termmeta(self, term_id):
        rows = self.q(
            "SELECT meta_key, meta_value FROM {p}termmeta WHERE term_id=%s AND meta_key NOT LIKE '\\_%%'",
            (term_id,),
        )
        return {r["meta_key"]: r["meta_value"] for r in rows}

    def attachment_url_map(self):
        # `guid` is unreliable as a direct file link for ~24% of attachments on this
        # site — some plugin (image aspect-ratio cropping, going by the URL shape)
        # rewrote their guid to a pretty attachment-page permalink like
        # ".../mg_9027-aspect-ratio-1-1/" instead of the actual image file. The real
        # relative file path always lives in `_wp_attached_file`, which combined with
        # the site's uploads base gives a genuine, hotlinkable image URL — so prefer
        # that and only fall back to guid when it's missing.
        rows = self.q("SELECT ID, guid FROM {p}posts WHERE post_type='attachment'")
        guid_by_id = {str(r["ID"]): r["guid"] for r in rows}

        attached_file_rows = self.q(
            "SELECT post_id, meta_value FROM {p}postmeta WHERE meta_key='_wp_attached_file'"
        )
        attached_file_by_id = {str(r["post_id"]): r["meta_value"] for r in attached_file_rows}

        result = {}
        for attachment_id, guid in guid_by_id.items():
            attached_file = attached_file_by_id.get(attachment_id)
            if attached_file:
                result[attachment_id] = f"https://theglobalacademy.ac/wp-content/uploads/{attached_file}"
            else:
                result[attachment_id] = guid
        return result

    def terms_for_post(self, post_id, taxonomy):
        rows = self.q(
            """
            SELECT t.term_id, t.name, t.slug FROM {p}term_relationships tr
            JOIN {p}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
            JOIN {p}terms t ON t.term_id = tt.term_id
            WHERE tr.object_id=%s AND tt.taxonomy=%s
            """,
            (post_id, taxonomy),
        )
        return rows


def mk_slug(text, fallback):
    if text:
        return text
    return re.sub(r"[^a-z0-9]+", "-", fallback.lower()).strip("-")


def extract_institutions(wp: WPDump, attachments: dict):
    terms = wp.q(
        "SELECT t.term_id, t.name, t.slug FROM {p}terms t JOIN {p}term_taxonomy tt ON tt.term_id=t.term_id WHERE tt.taxonomy='institutions'"
    )
    out = []
    for t in terms:
        meta = wp.termmeta(t["term_id"])
        logo_id = meta.get("logo", "").strip()
        out.append(
            {
                "wpTermId": t["term_id"],
                "name": t["name"],
                "slug": t["slug"],
                "motto": meta.get("motto") or None,
                "logoSourceUrl": attachments.get(logo_id) if logo_id else None,
                "location": meta.get("location") or None,
                "websiteUrl": meta.get("url") or None,
                "awards": meta.get("awards") or None,
                "rankings": meta.get("rankings") or None,
                "keyFacts": meta.get("key_facts") or None,
                "mainText": meta.get("institution_main_text") or None,
                "searchShortcode": meta.get("search_shortcode") or None,
            }
        )
    return out


GOAL_NUM_RE = re.compile(r"goal-0?(\d+)")


def extract_sdg_selection(meta):
    """Returns a list of {goal: int, targets: [str]} from goal_1/goal_2/goal_3 + goal_N_targets_M."""
    selections = []
    for slot in (1, 2, 3):
        goal_val = (meta.get(f"goal_{slot}") or "").strip()
        m = GOAL_NUM_RE.match(goal_val)
        if not m:
            continue
        goal_num = int(m.group(1))
        targets = None
        for key_variant in (f"goal_{slot}_targets_{goal_num}", f"goal_{slot}_targets_{goal_num:02d}"):
            if key_variant in meta and meta[key_variant]:
                parsed = php_unserialize(meta[key_variant])
                if isinstance(parsed, list):
                    targets = parsed
                break
        selections.append({"goal": goal_num, "targets": targets or []})
    return selections


def extract_researchers(wp: WPDump, attachments: dict):
    # Some profiles were submitted multiple times (repeat form submissions) and share
    # the same slug. The migration upserts by slug, so whichever record is processed
    # *last* for a given slug wins. Most duplicate groups are all "pending" copies of
    # each other, where it genuinely doesn't matter which one wins — but at least one
    # real case (dr-rajarshi-mitra) has a "publish" original plus a later "pending"
    # resubmission; a plain ID-ascending order let the pending resubmission overwrite
    # the real published profile, silently unpublishing it. So the order is: within
    # each slug group, "publish" always sorts last (wins over any pending copy); ties
    # broken by ID ascending, so among same-status duplicates the most recent
    # submission still wins, matching the original intent.
    posts = wp.q(
        "SELECT ID, post_title, post_name, post_status FROM {p}posts WHERE post_type='researchers' "
        "ORDER BY (post_status='publish') ASC, ID ASC"
    )
    out = []
    for p in posts:
        # postmeta_all, not postmeta: the featured-image ID lives in _thumbnail_id, which
        # a plain "exclude underscore-prefixed keys" filter would otherwise drop.
        meta = wp.postmeta_all(p["ID"])
        inst_terms = wp.terms_for_post(p["ID"], "institutions")

        photo_id = (meta.get("_thumbnail_id") or "").strip()
        if not photo_id:
            photo_id = (meta.get("researcher_photo") or "").strip()

        additional_jobs = []
        for i in range(0, 10):
            v = meta.get(f"additional_job_title_{i}_additional_job")
            if v:
                additional_jobs.append(v)

        additional_orgs = []
        for i in range(0, 10):
            v = meta.get(f"additional_organisations_{i}_additional_organisation")
            if v:
                additional_orgs.append(v)

        additional_groups = []
        for i in range(0, 10):
            name = meta.get(f"additional_research_groups_{i}_additional_research_group")
            if name:
                additional_groups.append({"name": name, "url": None})

        additional_projects = []
        for i in range(0, 10):
            v = meta.get(f"additional_projects_{i}_additional_project")
            if v:
                additional_projects.append(v)

        other_socials = []
        for i in (1, 2, 3):
            name = meta.get(f"other_social_{i}_name")
            link = meta.get(f"other_social_{i}_link")
            if name or link:
                other_socials.append({"label": name, "url": link})

        out.append(
            {
                "wpPostId": p["ID"],
                "status": p["post_status"],
                "slug": mk_slug(p["post_name"], p["post_title"] or str(p["ID"])),
                "title": meta.get("title") or None,
                "firstNames": meta.get("first_names") or None,
                "lastName": meta.get("last_name") or None,
                "fullName": p["post_title"].strip() if p["post_title"] else None,
                "abbreviations": meta.get("abbreviations") or None,
                "position": meta.get("job_title") or None,
                "additionalJobTitles": additional_jobs,
                "institutionTermId": inst_terms[0]["term_id"] if inst_terms else None,
                "currentPlaceOfWork": meta.get("current_place_of_work") or None,
                "photoSourceUrl": attachments.get(photo_id) if photo_id else None,
                "countryCode": clean_country(meta.get("country")),
                "additionalCountry1": clean_country(meta.get("additional_country_1")),
                "additionalCountry2": clean_country(meta.get("additional_country_2")),
                "languages": [l.strip() for l in (meta.get("languages") or "").split(",") if l.strip()],
                "researchFocus": meta.get("research_focus") or None,
                "sdgSelections": extract_sdg_selection(meta),
                "mainProject": meta.get("project") or None,
                "additionalProjects": additional_projects,
                "researchGroupName": meta.get("research_group") or None,
                "researchGroupUrl": meta.get("research_group_url") or None,
                "additionalResearchGroups": additional_groups,
                "citations": meta.get("citations") or None,
                "phdsSupervised": meta.get("phds_supervised") or None,
                "phdSupervisorName": meta.get("phd_supervisor_name") or None,
                "phdCompletionDate": meta.get("phd_completion_date") or None,
                "professionalOrganisation": meta.get("professional_organisation") or None,
                "additionalOrganisations": additional_orgs,
                "facebook": meta.get("facebook") or None,
                "twitter": meta.get("twitter") or None,
                "linkedin": meta.get("linkedin") or None,
                "googleScholar": meta.get("google_scholar") or None,
                "researchGate": meta.get("research_gate") or None,
                "mendeley": meta.get("mendeley") or None,
                "wikipedia": meta.get("wikipedia") or None,
                "bluesky": meta.get("bluesky") or None,
                "mastodon": meta.get("mastodon") or None,
                "threads": meta.get("threads") or None,
                "otherSocialLinks": other_socials,
                "videoUrl": meta.get("video_url") or None,
                "location": meta.get("map") or None,
                "trailblazer": (meta.get("trailblazer") or "").strip().lower() == "yes",
                "isPublished": p["post_status"] == "publish",
            }
        )
    return out


def extract_research_groups(wp: WPDump, attachments: dict):
    posts = wp.q(
        "SELECT ID, post_title, post_name, post_status FROM {p}posts WHERE post_type='research_groups'"
    )
    out = []
    for p in posts:
        meta = wp.postmeta(p["ID"])
        researcher_ids = php_unserialize(meta.get("researchers", "")) or []
        goals = []
        for i in range(0, 20):
            v = meta.get(f"goals_{i}_goal")
            if not v:
                continue
            m = GOAL_NUM_RE.match(v)
            if m:
                goals.append(int(m.group(1)))

        current_research = []
        for i in range(0, 20):
            title = meta.get(f"current_research_{i}_research_title")
            if title is None:
                break
            desc = meta.get(f"current_research_{i}_research_description")
            cr_goals = []
            for gi in range(0, 5):
                gv = meta.get(f"current_research_{i}_research_goals_{gi}_goals")
                if gv:
                    gm = GOAL_NUM_RE.match(gv)
                    if gm:
                        cr_goals.append(int(gm.group(1)))
            videos = []
            for vi in range(0, 15):
                vt = meta.get(f"current_research_{i}_research_videos_{vi}_research_video_title")
                vu = meta.get(f"current_research_{i}_research_videos_{vi}_research_video_url")
                if vt or vu:
                    videos.append({"title": vt, "url": vu})
            current_research.append(
                {"title": title, "description": desc, "sdgGoals": cr_goals, "videos": videos}
            )

        uni_logo_id = (meta.get("university_logo") or "").strip()
        group_photo_id = (meta.get("group_photo") or "").strip()

        out.append(
            {
                "wpPostId": p["ID"],
                "name": p["post_title"],
                "slug": mk_slug(p["post_name"], p["post_title"] or str(p["ID"])),
                "description": None,
                "focus": meta.get("research_group_focus") or None,
                "researcherWpIds": [int(r) for r in researcher_ids if str(r).isdigit()],
                "mainCountry": clean_country(meta.get("main_country")),
                "sdgGoals": goals,
                "currentResearch": current_research,
                "video": meta.get("research_group_video") or None,
                "universityLogoSourceUrl": attachments.get(uni_logo_id) if uni_logo_id else None,
                "groupPhotoSourceUrl": attachments.get(group_photo_id) if group_photo_id else None,
                "groupMap": meta.get("group_map") or None,
                "facebook": meta.get("group_facebook") or None,
                "twitter": meta.get("group_twitter") or None,
                "linkedin": meta.get("group_linkedin") or None,
                "wikipedia": meta.get("group_wikipedia") or None,
            }
        )
    return out


def extract_jobs(wp: WPDump):
    posts = wp.q(
        "SELECT ID, post_title, post_name, post_status, post_content, post_date FROM {p}posts WHERE post_type='job_listing'"
    )
    out = []
    for p in posts:
        # job_listing needs the UNDERSCORED WP Job Manager fields for its core data
        # (_company_name, _job_location, _application, _job_salary, ...) — those are
        # WPJM's real storage, not ACF shadow keys. The unprefixed ACF group
        # (employer_type, sector, academic_staff__faculty_roles, job_reference) is a
        # separate, optional add-on layer only present on some listings.
        meta = wp.postmeta_all(p["ID"])

        job_types = [t["name"] for t in wp.terms_for_post(p["ID"], "job_listing_type")]
        sdg_goal_terms = [t["name"] for t in wp.terms_for_post(p["ID"], "job_listing_category")]
        sdg_goal_nums = []
        for name in sdg_goal_terms:
            m = re.match(r"Goal (\d+)", name)
            if m:
                sdg_goal_nums.append(int(m.group(1)))

        sector = php_unserialize(meta.get("sector", "")) or []
        faculty_roles = php_unserialize(meta.get("academic_staff__faculty_roles", "")) or []

        application = (meta.get("_application") or "").strip()
        app_url = application if re.match(r"^https?://", application) else None
        app_email = application if "@" in application and not app_url else None

        out.append(
            {
                "wpPostId": p["ID"],
                "status": p["post_status"],
                "postedAt": str(p["post_date"]),
                "title": p["post_title"],
                "slug": mk_slug(p["post_name"], f"{p['post_title'] or ''}-{p['ID']}"),
                "companyName": meta.get("_company_name") or "Unknown employer",
                "employerType": meta.get("employer_type") or None,
                "employerPage": meta.get("employer_page") or meta.get("_company_website") or None,
                "location": meta.get("_job_location") or None,
                "isRemote": (meta.get("_remote_position") or "0").strip() not in ("", "0"),
                "description": p["post_content"] or "",
                "applicationUrl": app_url,
                "applicationEmail": app_email,
                "jobTypes": job_types,
                "sector": sector if isinstance(sector, list) else [sector],
                "academicStaffFacultyRoles": faculty_roles if isinstance(faculty_roles, list) else [faculty_roles],
                "sdgGoals": sdg_goal_nums,
                "jobReference": meta.get("job_reference") or None,
                "salaryText": meta.get("_job_salary") or None,
                "salaryCurrency": meta.get("_job_salary_currency") or None,
                "salaryUnit": meta.get("_job_salary_unit") or None,
                "expiresAt": meta.get("_job_expires") or meta.get("expiry_date") or None,
                "isPublished": p["post_status"] == "publish",
            }
        )
    return out


def extract_posts(wp: WPDump):
    posts = wp.q(
        "SELECT ID, post_title, post_name, post_status, post_content, post_excerpt, post_date FROM {p}posts WHERE post_type='post'"
    )
    out = []
    for p in posts:
        cats = [t["name"] for t in wp.terms_for_post(p["ID"], "category")]
        out.append(
            {
                "wpPostId": p["ID"],
                "status": p["post_status"],
                "title": p["post_title"],
                "slug": mk_slug(p["post_name"], p["post_title"] or str(p["ID"])),
                "excerpt": p["post_excerpt"] or None,
                "content": p["post_content"] or "",
                "categories": cats,
                "publishedAt": str(p["post_date"]),
                "isPublished": p["post_status"] == "publish",
            }
        )
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="wp_import")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="")
    ap.add_argument("--prefix", default=TABLE_PREFIX)
    ap.add_argument("--socket", default=None, help="Unix socket path (overrides --host/TCP if set)")
    ap.add_argument("--out", default="extracted")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    wp = WPDump(
        args.db, host=args.host, user=args.user, password=args.password, prefix=args.prefix, unix_socket=args.socket
    )

    print("Building attachment URL map...")
    attachments = wp.attachment_url_map()
    print(f"  {len(attachments)} attachments")

    print("Extracting institutions...")
    institutions = extract_institutions(wp, attachments)
    print(f"  {len(institutions)} institutions")

    print("Extracting researchers...")
    researchers = extract_researchers(wp, attachments)
    print(f"  {len(researchers)} researchers")

    print("Extracting research groups...")
    research_groups = extract_research_groups(wp, attachments)
    print(f"  {len(research_groups)} research groups")

    print("Extracting jobs...")
    jobs = extract_jobs(wp)
    print(f"  {len(jobs)} jobs")

    print("Extracting blog posts...")
    posts = extract_posts(wp)
    print(f"  {len(posts)} posts")

    for name, data in [
        ("institutions", institutions),
        ("researchers", researchers),
        ("research-groups", research_groups),
        ("jobs", jobs),
        ("posts", posts),
    ]:
        path = out_dir / f"{name}.json"
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        print(f"Wrote {path} ({len(data)} records)")


if __name__ == "__main__":
    main()
