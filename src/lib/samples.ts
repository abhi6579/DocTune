import type { Domain } from "@/lib/engine/configs";

export type SamplePack = {
  domain: Domain;
  docName: string;
  docContent: string;
  questions: string; // one per line: "Question ||| reference answer"
  blurb: string;
};

export const SAMPLES: Record<Domain, SamplePack> = {
  healthcare: {
    domain: "healthcare",
    docName: "adult-hypertension-anticoagulation-protocol.txt",
    blurb: "Clinic protocol with dosages, INR targets and thresholds.",
    docContent: `St. Aurora Regional Clinic — Adult Hypertension and Anticoagulation Protocol (Revised March 2024).

Section 1. Diagnosis and classification. Hypertension is confirmed when the average office blood pressure is 140/90 mmHg or higher, measured on at least two separate visits. Stage 1 hypertension is defined as 140-159 systolic or 90-99 diastolic. Stage 2 hypertension begins at 160/100 mmHg. Home monitoring is recommended twice daily for the first 2 weeks after any medication change.

Section 2. First-line pharmacotherapy. Lisinopril is the preferred first-line agent: the recommended starting dose is 10 mg once daily, titrated every 2 to 4 weeks to a maximum of 40 mg per day. When the estimated glomerular filtration rate is below 30 mL/min, the lisinopril starting dose is reduced to 5 mg once daily. If blood pressure remains above target after 4 weeks at 20 mg daily, amlodipine 5 mg once daily is added as combination therapy. Serum potassium and creatinine must be checked within 2 to 4 weeks of any ACE inhibitor initiation or dose increase.

Section 3. Comorbid diabetes. For patients with diabetes mellitus, the blood pressure target is below 130/80 mmHg. The HbA1c goal for most adults is below 7.0 percent, and ACE inhibitors remain first-line because of renal protection. Follow-up visits are scheduled every 4 weeks until the blood pressure target is reached, then every 6 months once stable.

Section 4. Anticoagulation in atrial fibrillation. Anticoagulation is indicated when the CHA2DS2-VASc score is 2 or higher. Warfarin therapy is initiated at 5 mg once daily, with INR checks every 3 to 4 days during initiation. The therapeutic INR range is 2.0 to 3.0, and INR below 1.5 for two consecutive checks requires dose escalation of 10 to 15 percent. Patients on warfarin must avoid chronic NSAID use because of bleeding risk.

Section 5. Direct oral anticoagulants. Apixaban 5 mg twice daily is the preferred alternative to warfarin. The dose is reduced to 2.5 mg twice daily when the patient meets at least two of the following: age 80 years or older, body weight 60 kg or less, or serum creatinine of 1.5 mg/dL or higher. Rivaroxaban 20 mg once daily with the evening meal is an acceptable second choice. No routine INR monitoring is required for apixaban or rivaroxaban.

Section 6. Safety and escalation. Any systolic reading of 180 mmHg or higher with end-organ symptoms is a hypertensive emergency and requires same-day evaluation. Annual monitoring includes eGFR, potassium, HbA1c, and a urinary albumin-to-creatinine ratio. Medication adherence should be reassessed at every visit, and pill burden should be minimized whenever clinically appropriate.`,
    questions: `What is the recommended starting dose of lisinopril for hypertension? ||| Lisinopril is started at 10 mg once daily and titrated to a maximum of 40 mg per day.
What INR range is targeted for patients on warfarin therapy? ||| The therapeutic INR range is 2.0 to 3.0, with INR checks every 3 to 4 days during initiation.
When should the apixaban dose be reduced to 2.5 mg twice daily? ||| When the patient meets at least two of: age 80 years or older, body weight 60 kg or less, or serum creatinine 1.5 mg/dL or higher.
What blood pressure level confirms a hypertension diagnosis? ||| An average of 140/90 mmHg or higher measured on at least two separate visits.
How often are follow-up visits scheduled until blood pressure is controlled? ||| Every 4 weeks until the blood pressure target is reached, then every 6 months once stable.
What is the blood pressure target for patients with diabetes? ||| Below 130/80 mmHg, with an HbA1c goal below 7.0 percent.`,
  },

  legal: {
    domain: "legal",
    docName: "master-services-agreement-excerpt.txt",
    blurb: "SaaS MSA excerpt with caps, clauses and notice periods.",
    docContent: `Master Services Agreement — Northwind Systems, Inc. and Client (Excerpt, Effective January 15, 2025).

Article 1. Services and acceptance. Northwind Systems will provide the cloud analytics platform described in each Statement of Work. Each SOW is incorporated into this Agreement, and in the event of conflict the terms of the SOW control over these master terms. The platform will be made available with a monthly uptime of 99.9 percent, measured excluding scheduled maintenance windows of up to 4 hours per month.

Article 2. Service level remedies. If monthly uptime falls below 99.9 percent but remains at or above 99.0 percent, Client receives a service credit equal to 10 percent of that month's fees. If uptime falls below 99.0 percent, the credit increases to 25 percent of the month's fees. Service credits are the sole and exclusive remedy for availability failures, and claims must be filed within 30 days of the incident.

Article 3. Fees and payment. Invoices are payable net 30 days from receipt. Late amounts accrue interest at 1.5 percent per month or the maximum rate permitted by law, whichever is lower. Fees are exclusive of taxes, and Client is responsible for all applicable sales and use taxes. Either party may dispute an invoice in good faith within 60 days of issuance.

Article 4. Confidentiality. Confidential Information includes all non-public technical, financial and business information disclosed by either party. The receiving party must protect such information using no less than reasonable care. Confidentiality obligations survive for 5 years following termination or expiration of this Agreement. Trade secrets remain protected for as long as they qualify as trade secrets under applicable law.

Article 5. Limitation of liability. Except for indemnification obligations and breaches of confidentiality, each party's total aggregate liability is capped at the fees paid or payable in the 12 months preceding the event giving rise to the claim. Neither party is liable for indirect, incidental, special, or consequential damages, including lost profits or lost data.

Article 6. Indemnification. Northwind will defend and indemnify Client against third-party claims alleging that the platform infringes a United States patent or copyright. Client will indemnify Northwind against claims arising from Client data or Client's violation of applicable law. The indemnified party must provide prompt written notice and reasonable cooperation.

Article 7. Term and termination. The initial term is 24 months from the Effective Date, renewing automatically for successive 12-month periods. Either party may terminate for convenience with 60 days prior written notice. Either party may terminate for material breach that remains uncured 30 days after written notice.

Article 8. Data protection and breach notice. Northwind will notify Client of any confirmed personal data breach within 72 hours of discovery, including the nature of the breach and remediation steps. Northwind maintains SOC 2 Type II certification and encrypts data in transit and at rest.

Article 9. Governing law and disputes. This Agreement is governed by the laws of the State of Delaware, excluding conflict-of-law rules. Any dispute will be resolved by binding arbitration in San Francisco, California under the Commercial Arbitration Rules of the American Arbitration Association, before a single arbitrator. The prevailing party is entitled to recover reasonable attorneys' fees.`,
    questions: `What is the liability cap under the agreement? ||| Total aggregate liability is capped at the fees paid or payable in the 12 months preceding the claim.
How long do confidentiality obligations survive after termination? ||| Confidentiality obligations survive for 5 years following termination or expiration.
Which state's law governs the agreement and where is arbitration held? ||| The agreement is governed by Delaware law, with binding arbitration in San Francisco under AAA rules.
What uptime does the SLA guarantee and what credits apply if it is missed? ||| 99.9 percent monthly uptime, with a 10 percent service credit below that level and 25 percent if uptime falls below 99.0 percent.
How much notice is required to terminate the agreement for convenience? ||| 60 days prior written notice.
How quickly must Northwind report a confirmed data breach? ||| Within 72 hours of discovery.`,
  },

  finance: {
    domain: "finance",
    docName: "heliotrope-q3-fy2025-earnings.txt",
    blurb: "Earnings release with revenue, margins and guidance figures.",
    docContent: `Heliotrope Technologies, Inc. — Third Quarter Fiscal 2025 Results (Press Release Excerpt, October 28, 2025).

Financial highlights. Heliotrope Technologies reported third quarter revenue of $4.82 billion, an increase of 18 percent year over year and 6 percent sequentially. Subscription revenue reached $3.42 billion, representing 71 percent of total revenue. International markets contributed 38 percent of revenue, led by 29 percent growth in the EMEA region.

Profitability. Gross margin expanded to 62.4 percent, up 140 basis points from the prior year quarter, driven by data center efficiency gains. Operating income was $1.16 billion, representing an operating margin of 24.1 percent. Non-GAAP diluted earnings per share were $1.27, ahead of the consensus estimate of $1.08. GAAP net income totaled $912 million.

Cash flow and balance sheet. Operating cash flow was $1.09 billion and free cash flow was $968 million. The company ended the quarter with $7.4 billion in cash and short-term investments against $2.3 billion of total debt. During the quarter Heliotrope repurchased $500 million of common stock and declared a quarterly dividend of $0.24 per share, payable December 12 to shareholders of record as of November 21.

Operational metrics. Remaining performance obligations grew to $2.9 billion, up 24 percent year over year. Net dollar retention was 118 percent. The number of customers with more than $100,000 in annual recurring revenue reached 3,240, up from 2,780 a year earlier. Total headcount was 12,850, an increase of 6 percent year over year, concentrated in research and go-to-market roles.

Guidance. For the full fiscal year 2025, the company raised revenue guidance to a range of $19.5 billion to $19.8 billion, up from the prior range of $19.1 billion to $19.4 billion. Fourth quarter revenue is expected between $5.05 billion and $5.15 billion. Full-year non-GAAP operating margin is now expected at 25.5 percent, an increase of 50 basis points versus prior guidance. Capital expenditures for the year are projected at $1.7 billion as the company expands AI inference capacity.

Forward-looking statements. This release contains forward-looking statements subject to risks and uncertainties, including macroeconomic conditions, foreign exchange rates, and demand for AI infrastructure. Actual results may differ materially from those projected.`,
    questions: `What revenue did Heliotrope report in Q3 FY2025? ||| Revenue of $4.82 billion, up 18 percent year over year.
What is the raised full-year revenue guidance? ||| Guidance was raised to $19.5 billion to $19.8 billion, from the prior range of $19.1 billion to $19.4 billion.
What gross margin did the company achieve in the quarter? ||| Gross margin of 62.4 percent, up 140 basis points year over year.
How much free cash flow was generated? ||| Free cash flow of $968 million, with operating cash flow of $1.09 billion.
What dividend per share was declared? ||| A quarterly dividend of $0.24 per share, payable December 12.
What was the net dollar retention rate? ||| Net dollar retention was 118 percent.`,
  },
};
