# Mainland China (CHN): data outbound rules

Rules for a mainland personal information processor that sends personal
information outside mainland China, including to Hong Kong, an affiliate, or a
branch.

This is not legal advice. Confirm the final position with PRC counsel.

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
- **Outbound transfer:** providing mainland PI to a recipient outside mainland
  China, including Hong Kong, an affiliate, or a branch.
- **Alpha:** the mainland company that collects or holds mainland PI.
- **Beta:** the Hong Kong company that collects or holds Hong Kong PI.

A remote login counts. If a manager in Hong Kong opens a mainland dashboard, the
data is accessed across the border even if no file is downloaded. Shared
ownership and a shared legal person do not merge Alpha and Beta; a branch and a
subsidiary change the contracts and the controller or processor roles, not the
location analysis.

## When the rules apply

- Alpha sends mainland PI to Beta or another recipient outside mainland China.
- A manager or staff member outside the mainland remotely accesses mainland PI.
- A mainland database, backup, log stream, or support tool is made available
  outside the mainland.
- A shared dashboard or shared CRM shows mainland lead records outside the
  mainland.

They do not apply to truly anonymous metrics.

## Requirements

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
5. **An intra-group data transfer agreement** with the recipient, including
   security, audit, sub-processor, and deletion terms.
6. **Minimization, security, records, retention, and withdrawal.** Send only what
   the review needs. Keep records of the transfer and the consent.
7. **Important data and CIIO rules.** If the data is important data, or Alpha is
   a critical information infrastructure operator, localization and a security
   assessment apply. Consent does not override those rules.
8. **Recipient obligations in Hong Kong.** A Hong Kong recipient remains a data
   user under the Personal Data (Privacy) Ordinance (Cap. 486). DPP1, DPP3, and
   DPP4 apply. See [HKG.md](./HKG.md).

## Thresholds

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

## Consent

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

## High-risk flows and filing basics

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

## Pragmatic gray areas

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

## Manager review scenario

- **Truly anonymous campaign metrics:** no PI crosses the border. A manager in
  Hong Kong can review them.
- **Raw lead records:** the full package applies: legal basis, Article 39
  consent, Article 38 mechanism or exemption, DPIA, and intra-group agreement.
- **Remote dashboard access:** counts as a transfer. Use role-based access and
  audit logs, and keep the data in the region unless the package is in place.
- **A handful of records for a specific review:** still a transfer. Minimize the
  fields and document the purpose.

## Consent design

Use a region-aware consent component, not one global banner:

- Load only essential cookies before consent.
- On the mainland, ask for consent for analytics and marketing. Add separate
  consent for sensitive PI only if you collect it. Do not show a cross-border
  consent checkbox when there is no cross-border flow.
- Record the consent version, timestamp, scope, and user identifier.
- Provide a cookie settings page and an easy withdrawal path.
- Do not rely on "by using this website you consent." The current policy text in
  `privacy-policy/content/en-US.mdx` and `zh-CN.mdx` uses that pattern and must
  be replaced.
- Publish a Simplified Chinese policy for the mainland app.
- If a residual cross-border flow remains, document it, keep separate consent
  for that flow, and pair it with the matching Article 38 mechanism.

## Tasks

- [ ] Build a data map: what PI is collected, where it is stored, who accesses
      it, and which vendor processes it.
- [ ] Choose the Article 38 mechanism or document the exemption, obtain Article
      39 notice and separate consent, complete the DPIA, and sign the
      intra-group agreement.
- [ ] Keep high-risk flows in the mainland: analytics, payments, auth, support
      widgets, and AI with user content.
- [ ] Default transactional email and SMS to mainland providers, and document
      any overseas provider you keep.
- [ ] Complete ICP filing, 公安备案, MLPS, and app filing for the mainland app.
- [ ] Add a region-aware consent component with records, withdrawal, and a
      cookie settings page.
- [ ] Publish an accurate Simplified Chinese policy and remove implied consent
      language.
- [ ] Sign data processing agreements with every vendor and keep a sub-processor
      list.
- [ ] Define retention, deletion, data subject request, and breach response
      procedures.
- [ ] Train staff and run a periodic audit.
- [ ] Confirm the current thresholds and exemptions with PRC counsel.

Quoted provisions: [PROVISION.md](./PROVISION.md).
