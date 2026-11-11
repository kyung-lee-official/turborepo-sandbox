# Hong Kong (HKG): data outbound rules

Rules for a Hong Kong data user that sends personal data outside Hong Kong,
including to mainland China, an affiliate, or another recipient.

This is not legal advice. Confirm the final position with Hong Kong counsel.

## Definitions

- **Personal information (PI):** any information related to an identified or
  identifiable natural person. An email address, phone number, IP address,
  device ID, cookie ID, and lead record are PI.
- **Anonymized data:** data that cannot identify a person and cannot be
  re-identified. It is outside these rules.
- **Aggregated data:** data combined into groups. It is outside these rules only
  when the group is large enough that no individual can be identified, directly
  or indirectly. Small groups, rare segments, and unique combinations can still
  be personal data.
- **Outbound transfer:** providing Hong Kong PI to a recipient outside Hong
  Kong, including mainland China, an affiliate, or a branch.
- **Alpha:** the mainland company that collects or holds mainland PI.
- **Beta:** the Hong Kong company that collects or holds Hong Kong PI.

A remote login counts. If a manager in mainland China opens a Hong Kong
dashboard, the data is accessed across the border even if no file is downloaded.
Shared ownership and a shared legal person do not merge Beta and Alpha; a branch
and a subsidiary change the contracts and the controller or processor roles, not
the location analysis.

## When the rules apply

- Beta sends Hong Kong PI to Alpha in mainland China or another recipient
  outside Hong Kong.
- A manager or staff member outside Hong Kong remotely accesses Hong Kong PI.
- A Hong Kong database, dashboard, or support tool is made available outside
  Hong Kong.
- A shared CRM shows Hong Kong lead records outside Hong Kong.

They do not apply to truly anonymous metrics.

## Requirements

1. **PDPO applies to Beta.** DPP1, DPP3, and DPP4 apply. Section 33 is not in
   force, so there is no statutory cross-border ban, but PCPD guidance expects
   due diligence, contractual safeguards, and a transfer impact assessment.
2. **An intra-group data transfer agreement** between Beta and the recipient.
3. **Access controls, audit logs, and minimization.** Do not copy the full Hong
   Kong database into an overseas system for a routine review.
4. **Purpose limitation.** If the overseas review is a new purpose, Beta needs a
   lawful basis and, where required, the individual's consent under DPP3.
5. **Destination note: mainland China.** PIPL applies to the processing in
   mainland China. There is no Article 38 export because the data is entering
   the mainland, not leaving it. If the Hong Kong data includes mainland
   individuals, PIPL's extraterritorial scope may apply to the Hong Kong
   processing. See [CHN.md](./CHN.md) for mainland outbound rules.

Export from Hong Kong has no Article 38-style mechanism, but it is not
automatically legal.

## Consent

Hong Kong users' consent can support the flow when it is informed and specific:

- Name the recipient and location.
- State the purpose, the data categories, the method, and the individual's
  rights.
- Keep it separate from the marketing consent and the privacy policy.
- Obtain it before the access, and honor withdrawal.

A generic "we use your data for marketing" consent from Beta does not cover an
overseas review. Shared ownership does not merge Beta and Alpha; they are
separate entities, so treat this as an inter-company transfer.

If the Hong Kong data includes mainland individuals, PIPL can apply
extraterritorially to the Hong Kong processing, and the analysis becomes
stricter. Check where the leads were collected and who they belong to.

## Manager review scenario

- **Truly anonymous campaign metrics:** no PI crosses the border. A manager in
  mainland China can review them.
- **Raw Hong Kong lead records:** PIPL applies to the mainland processing,
  PDPO applies to Beta, and the intra-group agreement and access controls are
  required. If the review is a new purpose, get consent under DPP3.
- **Remote dashboard access:** counts as access. Use role-based access and audit
  logs, and keep the copy in Hong Kong unless the agreement covers the mainland
  review.
- **A handful of records for a specific review:** still a transfer. Minimize the
  fields and document the purpose.

## Hong Kong app baseline

- Store Hong Kong user data in Hong Kong.
- Use regional or international vendors with a data processing agreement.
- Load Google Analytics and Meta only after consent, and name Google and Meta in
  the privacy notice.
- Keep Hong Kong support and admin access separate from the mainland app.

## Consent design

Use a region-aware consent component, not one global banner:

- Load only essential cookies before consent.
- On Hong Kong, ask for opt-in consent for direct marketing and provide cookie
  choices for analytics and advertising.
- Record the consent version, timestamp, scope, and user identifier.
- Provide a cookie settings page and an easy withdrawal path.
- Do not rely on "by using this website you consent." The current policy text in
  `privacy-policy/content/en-US.mdx` and `zh-CN.mdx` uses that pattern and must
  be replaced.
- Publish a Traditional Chinese plus English policy for the Hong Kong app.
- If a residual cross-border flow remains, document it and keep separate consent
  for that flow.

## Tasks

- [ ] Build a data map: what PI is collected, where it is stored, who accesses
      it, and which vendor processes it.
- [ ] Document the lawful basis, notice, security, purpose limitation, and
      intra-group agreement for each outbound flow.
- [ ] Add a region-aware consent component with records, withdrawal, and a
      cookie settings page.
- [ ] Publish a Traditional Chinese plus English policy and remove implied
      consent language.
- [ ] Load analytics and advertising tags only after consent, and name the
      vendors in the privacy notice.
- [ ] Keep Hong Kong support and admin access separate from the mainland app.
- [ ] Sign data processing agreements with every vendor and keep a sub-processor
      list.
- [ ] Define retention, deletion, data subject request, and breach response
      procedures.
- [ ] Train staff and run a periodic audit.
- [ ] Confirm the current position with Hong Kong counsel.

Quoted provisions: [PROVISION.md](./PROVISION.md).
