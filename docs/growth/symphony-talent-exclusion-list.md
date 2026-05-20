# Symphony Talent Exclusion List

**Purpose:** companies to exclude from Antellion paid LinkedIn campaigns and any other targeted outbound, to avoid serving competitive AI-visibility-audit messaging to Symphony Talent customers. Compliance hygiene against the ST contagion risk that motivated RULE-01 tightening on 2026-05-11.

**Status:** v1 draft 2026-05-19. Built from public ST and SmashFly case studies, customer references, and FeaturedCustomers listings. Maintenance protocol below.

**Limitations:**
- ST and SmashFly together claim ~600–750 customers globally. This list captures only the publicly-disclosed subset.
- Some entries may be historical case studies, not current customers. Exclude on the conservative side; better to skip serving a former customer than to serve a current one.
- Some company names have changed since the case study was published (Sprint → T-Mobile, FCA → Stellantis, CH2M → Jacobs). Both the original name and any successor entity should be excluded.

---

## v1 list (alphabetical, 20 companies)

| Company | Sector | Notes |
|---|---|---|
| Airbus | Aerospace / industrial | Employer brand case study |
| Amplifon | Healthcare / consumer | Employer brand case study |
| CH2M (now Jacobs) | Engineering / professional services | SmashFly customer reference; merged into Jacobs Engineering 2017 — exclude both |
| Eaton | Industrial / power management | FeaturedCustomers listing |
| Ecolab | Industrial / chemicals | Employer brand case study |
| FCA (now Stellantis) | Automotive | Employer brand case study; FCA merged into Stellantis 2021 — exclude both |
| Fiserv | Financial services / fintech | FeaturedCustomers listing |
| Hilton Grand Vacations | Hospitality | Employer brand + SmashFly customer |
| iQor | BPO / customer service | Press release on Symphony AI |
| Lazard | Financial services | Employer brand case study + FeaturedCustomers listing |
| Mars | Consumer goods | Employer brand case study |
| Nexans | Industrial / electrical | Employer brand case study |
| O-I (Owens-Illinois) | Industrial / packaging | Employer brand case study |
| Randstad | Staffing / HR services | FeaturedCustomers listing |
| Regis Corporation | Retail / consumer services | Employer brand case study |
| S&P Global | Financial services / data | FeaturedCustomers listing |
| Sky | Media / telecom | Employer brand case study |
| Sprint (now T-Mobile) | Telecom | FeaturedCustomers listing; acquired by T-Mobile 2020 — exclude both |
| Thomson Reuters | Media / data services | FeaturedCustomers listing |
| UCLA Health | Healthcare provider | Employer brand case study |

**Successor entities to also exclude** (from name-change / acquisition events above):
- Jacobs Engineering (CH2M successor)
- Stellantis (FCA successor)
- T-Mobile (Sprint successor)

---

## Also exclude (related entities, not customers but in the competitive surface)

- **Symphony Talent** itself (symphonytalent.com)
- **SmashFly Technologies** (acquired by Symphony Talent 2019, sometimes still appears as standalone reference)
- **Profound** — the AI visibility tool ST used to deliver their first AI-visibility-audit engagement (May 2026). Direct competitor / co-mentioned vendor. Should not see Antellion ads.

---

## Maintenance protocol

This list is incomplete by construction. ST has ~700 customers; this v1 captures roughly 3%. Extend as new public references surface.

**When to add a company:**
- ST publishes a new case study or customer success story → add the named company
- ST presents at a conference with a named customer on stage → add the customer
- A trade publication article identifies a company as an ST customer → add (verify if possible)
- A founder-facing observation (LinkedIn post mentions ST + a customer in same context, industry-newsletter article, etc.) → add with provenance note

**When to remove a company:**
- Only with clear evidence the company has switched away from ST (e.g., public announcement of new vendor). Default to leave-on-the-list.

**Update cadence:** review monthly. After each Diagnostic delivery, check whether the buyer's stated previous-vendors include ST → if yes, that company comes off the exclusion list (they're now an Antellion customer, no longer an ST customer).

**Storage:** this file is the canonical list. Apply to every paid LinkedIn campaign via Campaign Manager's company exclusion field. Apply to every cold-outreach Apollo filter as a negative-include rule.

---

## Sources used to build v1

- [Symphony Talent blog — Employer Brand Transformations showcase](https://www.symphonytalent.com/blog/symphony-talent-showcases-employer-brand-transformations/)
- [FeaturedCustomers — Symphony Talent vendor page](https://www.featuredcustomers.com/vendor/symphony-talent)
- [FeaturedCustomers — SmashFly vendor page](https://www.featuredcustomers.com/vendor/smashfly/case-studies)
- [iQor press release on Symphony [AI]](https://www.iqor.com/press-release/iqors-symphony-ai-transforms-talent-acquisition-for-client-success/)
- Various ST case study URLs (some 404 at present; replace with archive.org references when needed)

---

## Cross-references

- `docs/compliance-rules.md` § RULE-01 (Symphony Talent additive) — rationale for the contagion concern
- `.claude/agent-memory/.../project_symphony_talent_productization_may2026.md` — foundational ST productization signal
- `.claude/agent-memory/.../project_authority_surface_map_decisions_may2026.md` § Peer reference set — verified no overlap between current peer set (HubSpot, Stifel, Lincoln Electric, Slalom, Inovalon, Procore) and this exclusion list as of 2026-05-19
