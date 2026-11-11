# Data compliance

This document describes the personal data rules for two directions:

- **Mainland China to Hong Kong**
- **Hong Kong to Mainland China**

It applies to Company Alpha in mainland China and Company Beta in Hong Kong,
including managers and staff who access data across the border.

This is not legal advice. Confirm the final position with PRC and Hong Kong
counsel.

## Definitions

- **Personal information (PI):** any information related to an identified or
  identifiable natural person. An email address, phone number, IP address,
  device ID, cookie ID, and lead record are PI.
- **Anonymized data:** data that cannot identify a person and cannot be
  re-identified. It is outside the rules below.
- **Aggregated data:** data combined into groups. It is outside the rules only
  when the group is large enough that no individual can be identified, directly
  or indirectly. Small groups, rare segments, and unique combinations can still
  be personal data.
- **Mainland export:** providing mainland PI to a recipient outside mainland
  China, including Hong Kong, an affiliate, or a branch.
- **Hong Kong inbound:** providing Hong Kong PI to a recipient in mainland
  China, or accessing it from mainland China.
- **Alpha:** the mainland company that collects or holds mainland PI.
- **Beta:** the Hong Kong company that collects or holds Hong Kong PI.
- **Same owner, separate entities:** shared ownership and a shared legal person
  do not merge Alpha and Beta. A branch and a subsidiary change the contracts
  and the controller or processor roles, not the location analysis.

A remote login counts. If a manager in Hong Kong opens a mainland dashboard, or
a manager in mainland China opens a Hong Kong dashboard, the data is accessed
across the border even if no file is downloaded.

## PROVISION

The quoted provisions are in [PROVISION.md](./PROVISION.md).

## Mainland China to Hong Kong

This is an export under China's Personal Information Protection Law (PIPL).

### When it applies

- Alpha sends mainland PI to Beta or another recipient in Hong Kong.
- A manager or staff member in Hong Kong remotely accesses mainland PI.
- A mainland database, backup, log stream, or support tool is made available in
  Hong Kong.
- A shared dashboard or shared CRM shows mainland lead records in Hong Kong.

It does not apply to truly anonymous metrics.

### Requirements

1. **A legal basis** for the processing under PIPL Article 13.
2. **Article 39 notice and separate consent.** Tell the individual the overseas
   recipient's name and contact details, the purpose and method, the data
   categories, and how to exercise their rights against the recipient. Obtain
   separate consent before the transfer.
3. **An Article 38 mechanism**, unless an exemption applies:
   - security assessment,
   - standard contract filing,
   - personal information protection certification.
4. **A data protection impact assessment** under PIPL Articles 55 and 56.
5. **An intra-group data transfer agreement** with Beta, including security,
   audit, sub-processor, and deletion terms.
6. **Minimization, security, records, retention, and withdrawal.** Send only what
   the review needs. Keep records of the transfer and the consent.
7. **Important data and CIIO rules.** If the data is important data, or Alpha is
   a critical information infrastructure operator, localization and a security
   assessment apply. Consent does not override those rules.
8. **PDPO on the Hong Kong side.** Beta remains a data user under the Personal
   Data (Privacy) Ordinance (Cap. 486). DPP1, DPP3, and DPP4 apply. Section 33 is
   not in force, so there is no statutory cross-border ban, but PCPD guidance
   expects due diligence, contractual safeguards, and a transfer impact
   assessment.

### Thresholds

Verify the current thresholds. The rough picture is:

| Volume or data type                                   | Mechanism                                 |
| ----------------------------------------------------- | ----------------------------------------- |
| Under roughly 100k non-sensitive individuals per year | Article 38 mechanisms may not apply       |
| Roughly 100k to 1M individuals                        | Standard contract filing or certification |
| Over roughly 1M individuals                           | Security assessment                       |
| Sensitive PI over roughly 10k individuals             | Security assessment                       |
| Important data, or a CIIO                             | Security assessment                       |

Key points:

- There is no company-size qualification. An SME can file a standard contract.
- The standard contract is filed with the **provincial** cyberspace
  administration, not the State Cyberspace Administration.
- The standard contract is a filing, not an approval. The authority can reject a
  non-compliant filing.
- The low-volume exemption removes the Article 38 mechanisms. It does not remove
  the Article 39 notice and separate consent.
- The 2024 exemptions cover specific scenarios such as contract necessity, HR
  management, and free trade zones. A general marketing data review is not one of
  them.

### Consent

Article 39 is the notice and separate-consent rule. It is not the Article 38
mechanism.

- Name the recipient, the purpose, the data categories, the method, and the
  individual's rights.
- Keep the consent separate from the privacy policy and the terms of service.
- Obtain it before the transfer. A pre-checked box or a generic "we may share
  with affiliates" clause does not work.
- Consent for marketing messages is not consent for a cross-border transfer.
- Withdrawal must stop the transfer.
- Employee consent is often weak because of the power imbalance. Use another
  legal basis and the HR exemption where it applies.
- Consent alone does not make the transfer legal. You still need the Article 38
  mechanism or exemption, the DPIA, and the intra-group agreement.

### High-risk flows and filing basics

These are the flows that most often lead to penalties or fines. Keep them in
mainland China for mainland users.

- Overseas analytics and tracking SDKs on mainland pages: Meta Pixel, Google
  Analytics, Mixpanel, and similar products.
- Overseas payment processing for mainland users. Use WeChat Pay or Alipay.
- Overseas account or authentication systems for mainland users. Use
  self-hosted auth or a mainland identity provider.
- Overseas support widgets or AI services that receive mainland user content.
  Disable Intercom, Zendesk, and OpenAI for mainland users, or use a mainland
  alternative.
- The filing and consumer-protection basics:
  - ICP filing, 公安备案, MLPS, and app filing.
  - An accurate Chinese privacy notice.
  - Data minimization.
  - Separate consent for sensitive PI, third-party sharing, public disclosure,
    cross-border transfer, and automated decision-making.
  - Guardian consent for users under 14.
  - Marketing opt-in and opt-out.
  - Data subject requests within 15 working days.
  - Breach notification to authorities and affected users.

### Pragmatic gray areas

These are not hard bans. Default to a mainland provider, and document the flow
if you choose an overseas provider.

- **Transactional email.** Use Tencent Cloud SES or another mainland provider by
  default. An overseas provider is acceptable when you disclose it, keep the
  payload ordinary (email address plus a generic message), and record the legal
  basis or the applicable exemption. Do not send order details, attachments, ID
  documents, or other sensitive content through an undisclosed overseas
  provider.
- **SMS and OTP.** Use a mainland provider for deliverability and template
  approval. An overseas provider is often blocked or filtered by mainland
  carriers.
- **Monitoring and error tracking.** Scrub personal data before sending it to an
  overseas tool, or use a mainland stack.
- **CDN and static assets.** Serve mainland pages from a mainland CDN. The main
  hard requirement is ICP and reliable delivery. IP logging at an overseas CDN
  is lower risk than tracking, but it is still a data flow.
- **Inbound support email.** Prefer a mainland mailbox. If the mailbox is
  overseas, restrict access and disclose the processing location.
- **Admin and support access.** Keep access regional where practical. Document
  any cross-border access, and avoid bulk exports.
- **Fonts, maps, and captcha.** Self-host fonts and use Tencent or Baidu for maps
  and captcha. The hard rule is not "no Google product"; it is "do not send user
  personal data to an overseas tracking flow."

### Manager review scenario

- **Truly anonymous campaign metrics:** no PI crosses the border. A manager
  in Hong Kong can review them.
- **Raw lead records:** the full package applies: legal basis, Article 39
  consent, Article 38 mechanism or exemption, DPIA, and intra-group agreement.
- **Remote dashboard access:** counts as a transfer. Use role-based access and
  audit logs, and keep the data in the region unless the package is in place.
- **A handful of records for a specific review:** still a transfer. Minimize the
  fields and document the purpose.

## Hong Kong to Mainland China

This is an inbound flow into mainland China. It is not an Article 38 export from
mainland China, because the data is entering the mainland, not leaving it.

### When it applies

- Beta sends Hong Kong PI to Alpha in mainland China.
- A manager or staff member in mainland China remotely accesses Hong Kong PI.
- A Hong Kong database, dashboard, or support tool is made available in
  mainland China.
- A shared CRM shows Hong Kong lead records in mainland China.

It does not apply to truly anonymous metrics.

### Requirements

1. **PIPL applies to the processing in mainland China.** Alpha needs a lawful
   basis under PIPL Article 13, notice, security, retention limits, and data
   subject rights for the data it reviews in the mainland.
2. **PDPO applies to Beta as the Hong Kong data user.** DPP1, DPP3, and DPP4
   apply. Section 33 is not in force, so there is no statutory cross-border ban,
   but PCPD guidance expects due diligence, contractual safeguards, and a
   transfer impact assessment.
3. **An intra-group data transfer agreement** between Beta and Alpha.
4. **Access controls, audit logs, and minimization.** Do not copy the full Hong
   Kong database into a mainland system for a routine review.
5. **Purpose limitation.** If the mainland review is a new purpose, Beta needs a
   lawful basis and, where required, the individual's consent under DPP3.

This direction is easier on the export mechanism, but it is not automatically
legal.

### Consent

Hong Kong users' consent can support the flow when it is informed and specific:

- Name Alpha and mainland China as the recipient and location.
- State the purpose, the data categories, the method, and the individual's
  rights.
- Keep it separate from the marketing consent and the privacy policy.
- Obtain it before the access, and honor withdrawal.

A generic "we use your data for marketing" consent from Beta does not cover
Alpha's cross-border review. Shared ownership does not merge Beta and Alpha;
they are separate entities, so treat this as an inter-company transfer.

If the Hong Kong data includes mainland individuals, PIPL can apply
extraterritorially to the Hong Kong processing, and the analysis becomes
stricter. Check where the leads were collected and who they belong to.

### Manager review scenario

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

### Hong Kong app baseline

- Store Hong Kong user data in Hong Kong.
- Use regional or international vendors with a data processing agreement.
- Load Google Analytics and Meta only after consent, and name Google and Meta in
  the privacy notice.
- Keep Hong Kong support and admin access separate from the mainland app.

## Compliance checklist

### Consent design

Use a region-aware consent component, not one global banner:

- Load only essential cookies before consent.
- On the mainland, ask for consent for analytics and marketing. Add separate
  consent for sensitive PI only if you collect it. Do not show a cross-border
  consent checkbox when there is no cross-border flow.
- On Hong Kong, ask for opt-in consent for direct marketing and provide cookie
  choices for analytics and advertising.
- Record the consent version, timestamp, scope, and user identifier.
- Provide a cookie settings page and an easy withdrawal path.
- Do not rely on "by using this website you consent." The current policy text in
  `privacy-policy/content/en-US.mdx` and `zh-CN.mdx` uses that pattern and must
  be replaced.
- Publish region-specific policies: Simplified Chinese for the mainland app,
  Traditional Chinese plus English for the Hong Kong app.
- If a residual cross-border flow remains, document it, keep separate consent
  for that flow, and pair it with the matching Article 38 mechanism.

### Tasks

- [ ] Build a data map: what PI is collected, where it is stored, who accesses
      it, and which vendor processes it.
- [ ] For mainland to Hong Kong: choose the Article 38 mechanism or document
      the exemption, obtain Article 39 notice and separate consent, complete the
      DPIA, and sign the intra-group agreement.
- [ ] For Hong Kong to mainland: document the lawful basis, notice, security,
      purpose limitation, and intra-group agreement.
- [ ] Add a region-aware consent component with records, withdrawal, and a
      cookie settings page.
- [ ] Publish an accurate Simplified Chinese policy for the mainland and a
      Traditional Chinese plus English policy for Hong Kong. Remove implied
      consent language.
- [ ] Complete ICP filing, 公安备案, MLPS, and app filing for the mainland app.
- [ ] Keep high-risk flows in-region: analytics, payments, auth, support
      widgets, and AI with user content.
- [ ] Default transactional email and SMS to mainland providers, and document
      any overseas provider you keep.
- [ ] Sign data processing agreements with every vendor and keep a sub-processor
      list.
- [ ] Define retention, deletion, data subject request, and breach response
      procedures.
- [ ] Train staff and run a periodic audit.
- [ ] Confirm the current thresholds and exemptions with PRC and Hong Kong
      counsel.
