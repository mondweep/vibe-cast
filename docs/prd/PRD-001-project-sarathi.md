---
id: PRD-001
title: "Project Sarathi — Strategic Architectural Framework and PRD Blueprint for Automotive Omnichannel Customer Service in the Indian Market"
status: draft
author: Customer Service Leadership, [Automotive OEM]
date: 2026-05-31
sprint: S01
priority: P0
source: User-provided document (Automotive_Customer_Service_PRD_Strategy.md)
downstream:
  - OPTIONS.md
  - docs/adr/ADR-001-build-vs-buy-vs-hybrid.md  # to be created
  - docs/adr/ADR-002-indic-llm-model-selection.md  # to be created
  - docs/adr/ADR-003-agent-orchestration-pattern.md  # to be created
  - docs/spec/SPEC-001-project-sarathi.md  # to be created
---

# **Strategic Architectural Framework and Product Requirements Document (PRD) Blueprint for Automotive Omnichannel Customer Service in the Indian Market**

## **Executive Context and Market Complexities**

The Indian automotive sector is undergoing a profound digital transformation, characterized by rapidly shifting consumer expectations, the proliferation of digital touchpoints, and the increasing integration of software-defined vehicles into the broader consumer technology ecosystem. However, operating a unified customer service department across a subcontinent as geographically, culturally, and economically diverse as India requires a highly nuanced, multifaceted operational approach. Customer needs, baseline digital maturity, and regional technological infrastructure vary drastically from region to region, rendering monolithic digital strategies obsolete. Formulating a comprehensive customer service strategy—and subsequently developing the Product Requirements Document (PRD) to support its technological infrastructure—demands an architectural paradigm that is equally capable of serving the highly connected, tech-savvy demographics of South India and the resource-constrained, mobile-first populations in states like Bihar and Jharkhand.
An original equipment manufacturer (OEM) operating in this landscape cannot rely solely on traditional contact centers or isolated social media management tools. The modern automotive customer journey spans pre-sales research on independent forums, transactional interactions via regional dealerships, and post-sales service scheduling through digital applications. Customers engage with brand pages on mainstream platforms like Facebook and Instagram, but their purchasing decisions and post-purchase sentiments are heavily influenced by granular, highly technical interactions on industry-specific systems such as Team-BHP, CarWale, and CarDekho. Therefore, the OEM's technological infrastructure must evolve into a cohesive, intelligent Customer Experience (CX) platform that integrates unstructured social listening data, structured telematics data, and highly localized conversational artificial intelligence.
This comprehensive research report provides an exhaustive analysis of the geographical disparities in digital literacy, the fragmented landscape of automotive social engagement, and the enterprise technological solutions currently available to OEMs. Furthermore, it translates these strategic insights into an actionable, highly detailed PRD framework, designed to guide product management and engineering teams in developing a resilient, omnichannel CX and Dealer Management System (DMS) tailored specifically to the unique contours of the Indian automotive market.

## **Demographic Disparities and Digital Literacy Vectors**

The fundamental challenge in deploying a pan-India automotive customer service platform lies in the stark contrast in digital infrastructure, internet penetration, and functional digital literacy across different states. A centralized digital strategy inevitably fails when applied uniformly to such a heterogeneous user base. The OEM must architecture its systems to dynamically adapt to the digital maturity of the user interacting with the brand.

### **The Digital Maturity of South and West India**

Macro-level data indicates a high degree of digital penetration in South Indian states, operating alongside industrialized western states like Maharashtra and Gujarat. South Indian states collectively account for approximately 230 million internet users out of a total population of 270 million, representing an internet penetration rate of nearly 85 percent.1 Similarly, the western corridor comprising Maharashtra and Gujarat demonstrates an 80 percent penetration rate, harboring 160 million active users.1 This high digital density correlates directly with elevated consumer expectations within the automotive sector, driving demand for frictionless, low-latency digital experiences.
Consumers in these highly digitized regions exhibit a pronounced propensity for "cord-cutting" and non-traditional device usage, heavily utilizing connected smart televisions, high-speed mobile applications, and sophisticated digital interfaces.2 For an automotive OEM, this implies that the customer service architecture in South India and the Western industrial hubs must prioritize seamless self-service web portals, rich-media digital interactions, embedded in-car telematics applications, and high-fidelity omnichannel ticket routing. Customers operating within these demographics expect zero-latency responses, intuitive app-based service booking methodologies, and proactive maintenance alerts delivered via push notifications to their mobile devices or smartwatches, rather than relying on traditional, time-consuming voice calls to a dealership.

### **Infrastructure Deficits and Connectivity Challenges in Bihar and Jharkhand**

Conversely, the digital landscape in Eastern India, specifically in states like Bihar and Jharkhand, presents significant operational bottlenecks that require a completely divergent technological approach. Bihar consistently ranks at the absolute bottom among Indian states in terms of internet adoption and digital maturity, reporting a mere 32.45 internet subscribers per 100 individuals.3 Furthermore, an assessment of the internet infrastructure in Jharkhand reveals some of the lowest Internet Index scores nationwide, indicating severe systemic deficiencies in broadband availability and reliable mobile data services.4
The systemic issues extending across these regions go far beyond mere connectivity and hardware availability. Educational infrastructure, which serves as a leading indicator of future digital literacy and technology adoption rates, is severely lacking. Recent data highlights that in rural areas of Bihar and Jharkhand, only 28 percent of government schools possess functional computer laboratories.5 Furthermore, a mere 23 percent of teachers in these regions have received formal digital literacy training, and among them, less than half actively utilize digital tools in their instructional methodologies.5 Consequently, deploying a complex, text-heavy web application or a web-based chat interface for customer service in these regions will result in profound user friction and high abandonment rates.
The demographic divide is further complicated by a deeply entrenched gender digital divide. While the overall gender gap in internet access has narrowed in certain rural Indian sectors over the past few years, it has notably increased in specific states, with Jharkhand recording a concerning divergence in digital access between men and women.6 Bihar reports the lowest percentage of female internet users in the entire country.3 For an automotive OEM, this data presents a critical operational reality: female automotive customers, or female household decision-makers involved in the vehicle purchasing or maintenance lifecycle in these regions, are highly unlikely to interact with glossy brand pages on Facebook or Instagram. Instead, they are forced to rely on shared household devices, traditional feature phones, or voice-based telephony.3 The CRM infrastructure must, therefore, be capable of managing shared-device profiles, where a single WhatsApp number might represent multiple individuals within a household interacting with the OEM for different vehicles or service needs.

### **Strategic Implications for OEM Customer Service Architecture**

These unyielding geographic and demographic realities dictate a necessary bifurcation in the technological approach housed within the OEM's centralized Customer Relationship Management (CRM) system. To achieve true pan-India operational excellence, the platform must dynamically alter its interaction modalities based on the origin of the customer query.

| Demographic Profile | Regional Focus Areas | Primary Customer Experience (CX) Channels | Key Technological and Infrastructure Requirements |
| :---- | :---- | :---- | :---- |
| **High Digital Maturity** | South India, Maharashtra, Gujarat, Delhi NCR | Native Mobile App, Web Portals, X (Twitter), In-car Telematics, Connected TV | Self-service web portals, predictive AI modeling, complex UI/UX designs, unified app dashboards, instantaneous API syncs. |
| **Low Digital Maturity** | Bihar, Jharkhand, Rural Uttar Pradesh, Odisha | WhatsApp Business API, IVR, Traditional Voice Telephony, SMS | Voice-capable AI bots, vernacular Natural Language Processing (NLP), asynchronous WhatsApp integration, low-bandwidth interfaces. |

To effectively serve the user base in Bihar and Jharkhand, the OEM's customer service platform must pivot heavily toward low-friction, widely adopted communication channels—specifically WhatsApp and voice-based interactions. The integration of Natural Language Processing models that can comprehend regional dialects and the deployment of advanced voice-to-text transcription algorithms become absolute functional imperatives, moving the platform far beyond the standard English-language chatbot interfaces that dominate Western markets.7

## **The Digital Automotive Ecosystem: Social Media, Forums, and Unstructured Data**

Automotive customers in India do not limit their brand interactions to official OEM channels or dealership phone lines. The modern customer journey is highly fragmented, spanning broad social media platforms and deeply entrenched, highly influential niche automotive communities. Formulating a viable PRD requires designing sophisticated ingestion mechanisms to parse, analyze, and act upon unstructured data originating from these disparate external sources, transforming public commentary into actionable customer service tickets.

### **Mainstream Social Platforms and Shifting Commerce Trends**

While platforms like Facebook and Instagram remain critical for brand visibility, visual marketing, and top-of-funnel awareness, the nature of transactional engagement on these platforms is undergoing a rapid shift. Data indicates a noticeable slowdown in direct social media commerce, with users increasingly demonstrating a preference for cash-on-delivery models and moving away from executing high-value transactions directly on social applications.2 For an automotive customer service department, this behavioral shift suggests that mainstream social media should be treated primarily as a tool for broad sentiment tracking, public relations management, and handling preliminary inquiries, rather than a direct transactional medium for finalizing vehicle sales or processing complex service payments.
Furthermore, the prevalence of misinformation and cyber safety concerns on these platforms affects user trust. A global assessment indicates that 58 percent of students and younger demographics regularly encounter fake news or misinformation online, while 37 percent face cyberbullying or harassment.5 Consequently, users are migrating toward specialized, heavily moderated industry forums when making high-stakes financial decisions, such as purchasing an automobile. The OEM must ensure its social media integration can rapidly identify genuine customer grievances amidst the noise of general brand chatter, routing these critical interactions securely to the CRM core.

### **The Disproportionate Influence of Industry Systems and Niche Communities**

In the Indian automotive context, niche platforms and independent community forums yield disproportionate influence over consumer purchasing decisions, brand perception, and post-sale satisfaction metrics. Monitoring and integrating these platforms into the OEM's customer service workflow is non-negotiable.
**The Strategic Importance of Team-BHP:** Team-BHP stands as India's most respected, heavily moderated, and fiercely independent automotive community.9 Founded in 2004, the platform operates on a strict policy of accepting zero advertising revenue from the automotive industry, ensuring that its ownership reports, vehicle reviews, and technical insights remain entirely unbiased.10 Its recent strategic acquisition by the auto-tech platform CARS24 aims to bolster the site's digital infrastructure and integrate advanced AI tools while explicitly maintaining the community's independence and strict, non-sponsored moderation policies.9 Because Team-BHP users post highly detailed, technical accounts of their customer service experiences, dealership interactions, and long-term vehicle reliability, OEMs cannot afford to ignore this platform. A single negative thread detailing a poor service experience at a specific dealership can severely impact regional sales. However, traditional API integrations provided by enterprise CRMs are often restricted or entirely unavailable for independent forums. Monitoring Team-BHP requires sophisticated web scraping protocols or the integration of "Custom Sources" within the CX platform to capture brand mentions and sentiment analysis without violating the platform's terms of service.12
**The Role of CarWale and CarDekho:** Commercial platforms such as CarWale and CarDekho act as vital intermediaries in the Indian car buying and ownership lifecycle. Users frequently leverage these platforms to leave dealership reviews, complain about hidden costs, compare on-road prices across different cities, and assess vehicle specifications.15 These platforms possess robust backend architectures and, in some instances, provide developer APIs or are supported by community-maintained data scraping tools (such as Apify actors) that can be utilized to extract highly detailed user feedback, pricing metrics, and dealer performance indicators.13 By integrating data from CarDekho's support systems or scraping user comments from CarWale's review sections, the OEM can build a proactive customer service apparatus that identifies dissatisfied customers in the public domain and initiates service recovery protocols before the customer formally contacts the OEM.15

### **Implementing Advanced Social Listening and Disambiguation**

To successfully integrate these highly diverse channels into a centralized customer service operation, the technological platform must possess highly advanced, AI-driven social listening capabilities. A major architectural challenge in automotive social listening is the concept of "disambiguation"—the technical process of filtering out irrelevant data when a brand name or vehicle model is also a common noun, or when users employ regional slang.20 For example, tracking the model name "Safari" or "City" requires the system to differentiate between a user discussing a jungle expedition or urban planning versus a user reviewing a Tata or Honda vehicle. Deploying custom AI models via platforms like Sprinklr can successfully eliminate irrelevant social listening results, vastly improving the signal-to-noise ratio. In documented deployments, advanced disambiguation models achieved an 85 percent accuracy rate in identifying spam and irrelevant mentions, processing hundreds of thousands of messages and enabling customer service agents to focus strictly on actionable complaints, warranty queries, or genuine sales inquiries.20

## **Enterprise CRM and CX Platform Evaluation: Architecting the Technology Stack**

Before drafting the Product Requirements Document, a rigorous evaluation of the capabilities of existing enterprise Customer Relationship Management (CRM) and Customer Experience (CX) platforms is essential. An OEM of this scale rarely builds a core CRM entirely from scratch; instead, it licenses a foundational enterprise platform and heavily customizes its architecture to meet specific operational needs. The primary contenders for deploying a robust automotive customer service infrastructure in India include Salesforce Automotive Cloud, Sprinklr Unified-CXM, and Zoho CRM, augmented by specialized conversational AI tools for the WhatsApp ecosystem.

### **Salesforce Automotive Cloud and Agentforce**

Salesforce offers a highly specific, industry-tailored iteration of its massive ecosystem known as Automotive Cloud (which integrates its AI layer, formerly referred to as Agentforce). This solution is fundamentally designed to unify driver, vehicle, retail, and financial data across the entire automotive value chain.21

* **Architectural Strengths and Data Models:** Salesforce excels in internal data unification and rigid structural integrity. It provides a highly specialized Automotive Data Model, allowing OEMs to systematically track leads, prospective customers, and deeply detailed physical asset information.21 The integration of native telematics is a distinct, unparalleled advantage. Salesforce supports highly specific Data Model Objects, including Asset Telematics Event Data Model Object, Vehicle Trip Driver Behavior Data Model Object, and Calculated Insight: Count Of Total Cases By Vehicle.25 This profound level of data granularity enables the customer service team to transition from a reactive support posture to a highly predictive maintenance model. By analyzing telematics event codes, the CRM can automatically generate a service case and alert a customer in South India via their mobile app that their vehicle requires battery maintenance before the vehicle actually fails.
* **Customer Service Integration and Handoffs:** The unified agent console within Salesforce allows for seamless, frictionless handoffs from sales concierges to post-sales service agents.21 The platform seamlessly integrates digital engagement tools, self-service portals, voice telephony, and complex case management, tracking every issue from initial contact through to final resolution across the dealership network.23 Furthermore, it offers a Vehicle and Asset Lending Console, allowing the service team to assist users with loan applications and financial queries by integrating directly with credit bureaus like Experian and Equifax.25
* **Limitations and Integration Friction:** While Salesforce's integration with core business data, inventory, and telematics is arguably unparalleled, user reviews and technical assessments suggest that its native social listening capabilities—particularly for navigating niche forums, scraping unstructured web data, or monitoring non-standard platforms like Team-BHP—may not match the depth of dedicated CX platforms.27 Integrating complex social streams often requires substantial add-ons, middleware, or third-party integrations, which can increase the total cost of ownership and introduce latency into the agent workflow.27

### **Sprinklr Unified-CXM**

Sprinklr represents a dominant, highly specialized force in omnichannel social listening, proactive customer engagement, and unstructured data ingestion, and is widely utilized by leading global automotive manufacturers to manage brand perception.30

* **Architectural Strengths and Custom Ingestion:** Sprinklr's core value proposition lies in its exhaustive, industry-leading coverage of the digital landscape, encompassing mainstream social media, niche blogs, regional forums, review aggregators, and podcast transcripts.27 Crucially for the Indian market, it provides the architectural flexibility to add "Custom Sources." This feature enables the OEM's customer service team to raise configuration requests to ingest data from regional review domains or specific sites that are not natively supported by standard APIs, which is absolutely vital for monitoring independent platforms like Team-BHP or regional vernacular news outlets.12
* **AI Disambiguation and Proactive Engagement:** Sprinklr's AI Studio provides highly sophisticated spam identification and disambiguation models, achieving exceptional accuracy in filtering out irrelevant mentions of common-noun vehicle names.20 In documented automotive case studies, deploying Sprinklr's unified AI platform enabled global automakers to reduce inbound message response times by 12 percent while simultaneously empowering small social media teams to handle a staggering 512 percent increase in total case volume over a single year.30 This is achieved by shifting the operational focus from purely reactive ticket closing to proactive engagement—surprising loyal customers, re-engaging abandoned inquiries, and instantly identifying high-priority complaints before they escalate into public relations crises.30
* **Limitations and Operational Depth:** For organizations requiring deep, transactional integration with supply chain logistics, hard sales data, financial underwriting, and traditional dealership physical workflows (such as tracking courtesy car inventory or spare parts), Sprinklr lacks the comprehensive, rigid CRM depth of Salesforce or Zoho. Deploying it as a primary customer service tool often necessitates complex, bi-directional API integrations—such as connecting Sprinklr Service to ServiceNow or a legacy ERP system—to ensure that a social media complaint actually results in a physical wrench turning at a local dealership.27

### **Zoho CRM for Automotive and Dealer Management**

Zoho presents a highly adaptable, customizable, and increasingly popular alternative that has seen significant adoption and validation within the Indian automotive market. This is most notably demonstrated by Mercedes-Benz India's recent launch of 'SkyLine'—a massive, made-in-India, end-to-end Dealer Management System built entirely on the Zoho CRM framework.33

* **Architectural Strengths and Dealership Synchronization:** Zoho CRM provides comprehensive end-to-end functionality that encompasses physical dealership management, inventory tracking, sales order generation, and omnichannel communication.34 The platform is particularly adept at supporting automated, complex logistics flows via Zoho CommandCenter, managing everything from warehouse restock requests to physical vehicle inspection reports and automated payment reminders.36
* **Local Market Alignment and Value:** Zoho's massive engineering and support presence in India ensures robust localized support, rapid implementation times, and strict compliance with local data sovereignty regulations. It features natively integrated social CRM modules designed to monitor brand mentions and engage prospects directly without aggressive hard-selling tactics.35
* **Use Case Validation in India:** The Mercedes-Benz 'SkyLine' implementation serves as undeniable proof of Zoho's capacity to handle highly complex, nationwide dealership networks. SkyLine digitizes the entire vehicle service lifecycle, seamlessly managing service bookings, digital check-ins, vehicle inspections, real-time estimate approvals, skill-based technician assignments, and post-service feedback collection across every single Mercedes-Benz dealership in India.33 It also manages auxiliary operations such as courtesy car availability tracking and pre-owned vehicle refurbishment workflows.33

### **The Conversational AI and WhatsApp Integration Layer**

Given the uncompromising demographic realities of states like Bihar, Jharkhand, and rural Uttar Pradesh, the core CRM (whether Salesforce, Sprinklr, or Zoho) must be fundamentally augmented with a hyper-localized conversational AI layer. WhatsApp is the undisputed, de facto communication protocol in India, transcending socioeconomic, geographic, and digital literacy barriers. An automotive customer service strategy without deep WhatsApp integration is inherently flawed.

* **Capabilities and API Requirements:** The technological platform must support official, Meta-approved WhatsApp Business API integrations.38 Third-party providers and middleware platforms such as Mark360, Botsense, and Converse.so offer sophisticated tools specifically tuned for the nuances of the Indian automotive market.38 These platforms enable automated test drive bookings, service reminders, and lead management entirely within the WhatsApp interface.39
* **Voice AI and Vernacular LLMs:** Standard text-based chatbots are demonstrably insufficient for populations with lower literacy rates or those who simply prefer voice communication. The integration architecture must include AI Voice Automation capable of processing both inbound and outbound calls in regional languages (e.g., Hindi, Tamil, Telugu, Bhojpuri).7 Specialized AI startups like Rootle and Sarvam AI focus on developing India-centric Large Language Models (LLMs) that detect regional languages in real-time, translate conversations seamlessly without interrupting the flow, and score lead intent based on emotional signals and budget keywords captured during live voice calls.7
* **Bidirectional CRM Synchronization:** The WhatsApp and Voice AI integration must feature absolute, real-time bidirectional CRM syncing. Technical capabilities must include webhook configurations that trigger the automatic creation of a CRM contact upon receiving an unknown WhatsApp message, intelligent inquiry detection that tags a conversation as a "Sales Inquiry" or "Service Complaint" based on NLP analysis, and Voice Message Transcription that automatically generates structured CRM notes from rural customers sending audio clips.40 Furthermore, the system must be capable of pushing dynamic content—such as product brochures, PDF invoices, or payment links—via WhatsApp while a live voice call is still ongoing.8

## **Product Requirements Document (PRD) Strategy and Architecture**

Writing a Product Requirements Document for an enterprise system of this magnitude requires a delicate balance between providing comprehensive, unyielding detail and maintaining the agility required for continuous software development. A successful PRD acts as the project's compass, roadmap, and ultimate source of truth, aligning stakeholders across product management, UI/UX design, backend engineering, and regional dealership management.41

### **Core Philosophy and Best Practices for the Automotive CX PRD**

Extensive industry analyses and product management frameworks indicate that bloated, highly prescriptive PRDs often fail because they devolve into disconnected feature lists rather than focusing on solving validated user problems.41 To optimize the PRD for the extreme variables of the Indian automotive landscape, the following foundational principles must be strictly observed during its creation:

1. **Anchor on the Problem, Not Premature Solutions:** The PRD must clearly articulate the geographic and demographic challenges outlined in the preceding sections. For instance, the stated problem is not the absence of a chatbot; the problem is that 65 percent of users in Jharkhand abandon digital service bookings due to language barriers, low bandwidth, and complex English-first web interfaces.44 The solution is contextual.
2. **Explicitly Define Exclusions:** Scope creep is highly prevalent and notoriously destructive in enterprise CRM deployments.43 The PRD must explicitly state exclusions in a dedicated "What We Are Not Building" section (e.g., "Phase 1 will not include integration with legacy mainframe supply chain systems for raw material procurement").41 This protects engineering bandwidth.
3. **Metrics-Driven Validation:** The document must define granular success metrics that extend far beyond basic project delivery timelines. Success metrics must be tied to business outcomes, such as a measured reduction in time-to-resolution, tracking adoption rates of the WhatsApp bot specifically in Tier 3 cities, and quantifying sentiment score improvements on external forums like Team-BHP.43 Arbitrary technical metrics (e.g., "every page must load in under 500ms") should be avoided unless empirical user research proves they directly dictate user adoption in low-bandwidth areas.45
4. **Embrace Agile Collaboration:** The PRD must not be a static PDF or isolated text document. It should be constructed as a living system housed within a collaborative enterprise environment (e.g., Atlassian Confluence linked to Jira), allowing software engineers to actively question constraints, track dependencies, and propose superior architectural solutions as development progresses.42

## **The Formal PRD Blueprint: Project Sarathi**

The following sections provide the structural foundation, essential data models, and critical content blocks required for the OEM's formal PRD. This blueprint is designed to be immediately actionable by technical product managers.

### **1. Document Metadata and Change History**

* **Project Title:** Project Sarathi (Omnichannel CX and Unified Resolution Platform)
* **Document Version:** 1.0 (Draft)
* **Target Release Window:** Q3 2026
* **Product Owner:** Lead, Customer Service Department (OEM)
* **Strategic Objective:** Unify fragmented customer interactions across India's disparate digital landscape into a single, intelligent agent console, dynamically serving both high-digital-maturity urban customers and mobile-first rural demographics.

### **2. User Personas and Interaction Contexts**

To ensure the engineering team understands the human context behind the code, the system must cater to the following primary personas:

| Persona Name | Demographic Profile | Operational Pain Points | Primary Interaction Preference |
| :---- | :---- | :---- | :---- |
| **Karthik (The Tech-Savvy Urbanite)** | 32, IT Professional, Bengaluru, South India. Owns a newly launched connected EV. | Intensely dislikes voice phone calls. Frustrated if the OEM app fails to display real-time service bay status or battery health. | Native in-app support, Twitter (X) mentions, Self-service web portals. |
| **Rajesh (The Rural Entrepreneur)** | 45, Fleet Owner, Patna, Bihar. Owns three entry-level sedans. | Possesses low English literacy. Operates in areas with poor internet bandwidth. Relies heavily on oral communication. | WhatsApp voice notes, traditional phone calls, vernacular IVR systems. |
| **Priya (The Social Researcher)** | 28, Doctor, Mumbai, Maharashtra. Researching a new luxury SUV purchase. | Relies heavily on peer reviews from Team-BHP and CarWale. Expects high brand responsiveness to online queries. | Independent automotive forums, Instagram comments, Web Chat. |
| **Amit (The Service Agent)** | 29, OEM Central Customer Care Center. | Overwhelmed by constantly toggling between five different applications to locate vehicle history, monitor social media complaints, and view telematics data. | A singular, unified desktop console with AI-assisted response generation. |

### **3. Core Functional Requirements (Epics and User Stories)**

The functional requirements are structured into distinct Epics, representing large bodies of work that will be broken down into specific Jira tickets.

#### **Epic 1: Omnichannel Ingestion, Disambiguation, and Routing**

The platform must ingest unstructured data from traditional channels, mainstream social media, and third-party review aggregators, utilizing AI to filter noise and route tickets intelligently to the correct regional service desk.

* **User Story 1.1 (Custom Source Integration):** As a system administrator, I must be able to configure Custom Sources via APIs or web scraping webhooks (e.g., utilizing Apify actors) to monitor predefined brand keywords on niche forums like Team-BHP and CarWale, ensuring no critical complaint is missed.12
* **User Story 1.2 (AI Spam Filtering):** As a customer service agent, I need the system's ingestion engine to utilize an AI disambiguation model to automatically close or ignore social mentions where the vehicle model name is used as a common noun (e.g., distinguishing between a "City" car and an urban area), maintaining a minimum 85 percent accuracy in spam identification to protect my bandwidth.20
* **User Story 1.3 (Linguistic Routing):** As an operational manager, I require the routing algorithm to dynamically assign tickets based on NLP language detection. For example, any inbound WhatsApp message or social comment containing Tamil text must be automatically routed to the Chennai service desk, bypassing the English-speaking queue entirely.7

#### **Epic 2: Hyper-Localized Conversational AI and Voice Integration**

This epic directly addresses the digital and infrastructure divide prevalent in Eastern India by deploying accessible, asynchronous, and voice-native communication protocols.

* **User Story 2.1 (Vernacular Voice Ingestion):** As a rural customer in Jharkhand, I want the ability to send a spoken voice note in Hindi via WhatsApp to report a severe engine issue, and have the system instantly acknowledge the receipt of my complaint in Hindi.7
* **User Story 2.2 (Automated Transcription):** As a service agent handling the Bihar queue, when I receive a WhatsApp voice note from a customer, the system must automatically transcribe the audio into structured English text, summarize the core issue, and attach it permanently to the customer's CRM entity record.40
* **User Story 2.3 (Asynchronous Fallback):** As a customer experiencing poor connectivity, if my live voice call drops, I want the system to instantly and automatically send me a WhatsApp message containing a context-aware link, allowing me to continue the service booking process asynchronously without losing my place in the queue.8

#### **Epic 3: Telematics and Proactive Support Integration**

Leveraging connected vehicle data primarily for South Indian and urban markets to shift the operational model from reactive troubleshooting to proactive, predictive maintenance.

* **User Story 3.1 (Agent Console Telematics):** As a service agent, when Karthik (the urban EV owner) initiates a chat, I need my Unified Agent Console to automatically display real-time Telematics Event Data (e.g., current battery health percentages, recent diagnostic fault codes) pulled directly from the Vehicle Performance Summary Data Model Object.21
* **User Story 3.2 (Predictive Case Generation):** As the core CRM system, upon receiving a critical engine or battery fault code via the telematics API, I must automatically generate a high-priority proactive service ticket and simultaneously dispatch a localized push notification to the user's mobile app, prompting them to approve a pre-filled service appointment.25

#### **Epic 4: Physical Dealership Management and Logistics Synchronization**

Connecting the digital customer service cloud with the physical realities of the dealership floor, modeled after the successful Zoho 'SkyLine' framework.

* **User Story 4.1 (Inventory Visibility):** As a centralized service agent, when attempting to book a complex repair appointment for a frustrated customer, I require real-time API visibility into the specific local dealership's physical service bay availability and their current inventory of loaner/courtesy cars.33
* **User Story 4.2 (Review Alerting):** As a regional dealership manager, I must receive automated, high-priority notifications if a customer leaves a negative post-service review on CarDekho regarding my specific geographic location, allowing me to initiate immediate service recovery protocols.15

### **4. Technical and Non-Functional Requirements (NFRs)**

The technical constraints under which the system must operate to remain viable in the Indian infrastructure ecosystem.

| Category | Requirement Specification | Justification and Context |
| :---- | :---- | :---- |
| **Scalability and Load** | The architecture must comfortably support the ingestion and processing of over 100,000 social mentions and WhatsApp API messages daily, with auto-scaling capabilities to handle a 300% surge. | Essential for accommodating massive traffic spikes typical during Indian festive seasons (e.g., Diwali) when automotive inquiries peak dramatically.20 |
| **Data Security and DPDP** | All ingested telematics data, location tracking, and Personally Identifiable Information (PII) processed via WhatsApp or web portals must be end-to-end encrypted and strictly comply with the Indian Digital Personal Data Protection (DPDP) Act. | Mandatory legal compliance to prevent severe regulatory penalties and protect consumer trust.40 |
| **Latency and NLP Speed** | Real-time translation, intent scoring, and transcription of live voice notes via the localized AI engine must execute and return data within 3.0 seconds. | High latency destroys the illusion of conversational flow during live voice bot interactions or synchronous WhatsApp chats, leading to high abandonment rates.7 |
| **System Interoperability** | The platform must expose robust RESTful APIs to interface securely and seamlessly with the OEM's existing legacy ERP mainframe systems (e.g., SAP or Oracle). | Customer service agents require access to legacy databases for live parts inventory checking and historical billing inquiries.50 |

### **5. Out of Scope (Phase 1 Boundaries)**

To aggressively prevent scope creep and ensure the timely delivery of the core CX capabilities, the following elements are explicitly excluded from the Phase 1 release architecture:

* **Direct E-commerce Vehicle Purchasing:** The platform will not support the end-to-end financial purchase of a vehicle via WhatsApp. The focus remains strictly on pre-sales lead qualification, post-sales service, and appointment booking.
* **Supply Chain Procurement AI:** Integration of predictive supply chain modeling for ordering raw manufacturing materials based on customer sentiment is excluded.
* **Comprehensive Dealership Accounting:** The platform will handle customer-facing estimates and final billing views, but will not replace the dealership's core backend accounting software for payroll or vendor management.

### **6. Success Metrics and Business Validation**

The deployment of Project Sarathi will be considered successful if the following quantifiable metrics are achieved within two quarters of the final release:

* **Metric 1 (Efficiency):** A sustained 40 percent reduction in initial first-response times across all digital channels, driven by the AI disambiguation engine filtering out noise.
* **Metric 2 (Rural Adoption):** A 30 percent deflection of routine, low-value service booking calls to the vernacular WhatsApp automated bot in Tier 2 and Tier 3 cities, specifically measuring adoption in regions like Bihar, Jharkhand, and rural UP.
* **Metric 3 (Unstructured Data Accuracy):** Maintaining a 90 percent accuracy rate in the automated tagging, sentiment scoring, and routing of unstructured complaints originating from independent systems like Team-BHP and CarWale.
* **Metric 4 (Bridging the Divide):** A statistically significant increase in Customer Satisfaction (CSAT) scores specifically mapped to female demographic profiles in rural areas, indicating the successful circumvention of the gender digital divide through the implementation of accessible, shared-device communication channels like WhatsApp voice.

## **Strategic Conclusions**

Deploying a unified, pan-India customer service platform for a major automotive OEM requires confronting the subcontinent's vast, uncompromising economic, linguistic, and technological disparities head-on. An operational strategy that exclusively relies on glossy, data-heavy web applications or advanced in-car telematics will inevitably alienate the massive, rapidly growing consumer bases in Eastern states like Bihar and Jharkhand, where functional digital literacy and foundational infrastructure severely lag behind the national curve. Conversely, relying purely on traditional, friction-heavy voice telephony will frustrate and ultimately drive away the highly connected, convenience-driven consumers in South India and the Western industrial hubs.
The solution mandates a sophisticated, hybrid technological architecture. At the absolute core, an enterprise-grade CRM (whether leveraging the deep physical integration of Zoho CRM or the robust data modeling of Salesforce Automotive Cloud) must act as the central nervous system, maintaining the definitive, single-source-of-truth customer record. However, this rigid core must be entirely decoupled from the fluid engagement layers. The engagement layer must be hyper-adaptable—deploying sophisticated, API-driven scraping tools to parse highly technical, unstructured data from niche, high-value forums like Team-BHP, while simultaneously deploying hyper-localized, voice-capable conversational AI over WhatsApp to serve rural, low-literacy, and female demographics effectively.
By executing the comprehensive PRD framework outlined in this document, the OEM's product management and engineering teams can transition the organization away from fragmented, reactive support models. In its place, they will construct a proactive, culturally attuned, and technologically resilient customer experience ecosystem, fully capable of securing long-term brand loyalty across the entirety of the Indian demographic spectrum.

#### **Works cited**

1. India states wise internet subscribers at the end of the march 2025 : r/IndiaStatistics — Reddit, accessed on May 31, 2026, https://www.reddit.com/r/IndiaStatistics/comments/1qaqi7d/india_states_wise_internet_subscribers_at_the_end/
2. Internet in India 2024 — IAMAI, accessed on May 31, 2026, https://www.iamai.in/sites/default/files/research/Kantar_%20IAMAI%20report_2024_.pdf
3. Working Towards Bridging the Gender Digital Divide in Bihar — C3India, accessed on May 31, 2026, https://www.c3india.org/uploads/news/Briefing_Paper_Gender_Digital_Divide_03032021.pdf
4. Digital Fluency Quotient: Assessing Consumption Maturity of Internet users in Rural and Suburban India, accessed on May 31, 2026, https://ncgg.org.in/sites/default/files/lectures-document/Research_Paper_Nilabhra_Auddy.pdf
5. Bridging the Digital Divide — Times Of Pedia, accessed on May 31, 2026, https://timesofpedia.com/bridging-the-digital-divide/
6. State of India's Digital Economy (SIDE) Report 2024 — Indian Council for Research on International Economic Relations (ICRIER), accessed on May 31, 2026, https://icrier.org/pdf/State_of_India_Digital_Economy_Report_2024.pdf
7. How To Build A Multilingual AI Text Bot For SMS, WhatsApp, Email, And Live Chat, accessed on May 31, 2026, https://crm-messaging.cloud/blog/how-to-build-a-multilingual-ai-text-bot-for-sms-whatsapp-email-and-live-chat/
8. Voice AI for Lead Qualification | Prioritize High-Intent Leads — Rootle.ai, accessed on May 31, 2026, https://rootle.ai/voice-ai-for-lead-qualification/
9. Trust meets Technology | CARS24 invests in India's most trusted auto community, Team-BHP, accessed on May 31, 2026, https://www.team-bhp.com/forum/announcements/293581-trust-meets-technology-cars24-invests-india-s-most-trusted-auto-community-team-bhp.html
10. Team-BHP — India's Most Trusted Car Reviews & News, accessed on May 31, 2026, https://www.team-bhp.com/
11. CARS24 acquires Team-BHP — Entrackr, accessed on May 31, 2026, https://entrackr.com/snippets/cars24-acquires-team-bhp-8992821
12. Adding a Custom Source | Sprinklr Help Center, accessed on May 31, 2026, https://www.sprinklr.com/help/articles/sources/adding-a-custom-source/63e3951555780d70a15bda1b
13. Cardekho Used Car Search Scraper API in JavaScript — Apify, accessed on May 31, 2026, https://apify.com/stealth_mode/cardekho-used-car-search-scraper/api/javascript
14. Carwale Scraper API — Apify, accessed on May 31, 2026, https://apify.com/shahidirfan/carwale-scraper/api
15. CarWale — Buy new, used cars — Ratings & Reviews — App Store — Apple, accessed on May 31, 2026, https://apps.apple.com/us/app/carwale-buy-new-used-cars/id910137745?see-all=reviews&platform=iphone
16. Scrape CarWale Car Data — New Launches, Specs & Features — Medium, accessed on May 31, 2026, https://medium.com/@creativeclicks1733/scrape-carwale-car-data-new-launches-specs-features-07e7b0715eb5
17. Ashutosh1702/cardekho — GitHub, accessed on May 31, 2026, https://github.com/Ashutosh1702/cardekho
18. Contact Us — CarDekho, accessed on May 31, 2026, https://www.cardekho.com/info/contact_us
19. Certified CIC | CarDekho.com, accessed on May 31, 2026, https://www.cardekho.com/ta/info/certified-cic
20. Luxury car company conquers the common name game in social listening — Sprinklr, accessed on May 31, 2026, https://www.sprinklr.com/stories/luxury-car-company/
21. What Is Automotive Cloud? — Salesforce, accessed on May 31, 2026, https://www.salesforce.com/automotive/cloud/guide/
22. How Salesforce Automotive Cloud Is Supercharging the Future of Connected Vehicles and Customer Experiences, accessed on May 31, 2026, https://www.salesforce.com/news/stories/automotive-cloud-news-ces/
23. Best Automotive Cloud CRM by Salesforce, accessed on May 31, 2026, https://www.salesforce.com/in/automotive/cloud/
24. Automotive Cloud Data Model — Salesforce Help, accessed on May 31, 2026, https://help.salesforce.com/s/articleView?id=ind.auto_data_model.htm&language=en_US&type=5
25. Automotive Cloud — Salesforce Help, accessed on May 31, 2026, https://help.salesforce.com/s/articleView?id=ind.auto_cloud.htm&language=en_US&type=5
26. 12 Top Customer Engagement Platforms in 2025 — Sprinklr, accessed on May 31, 2026, https://www.sprinklr.com/blog/customer-engagement-platforms/
27. 10 Best Sprinklr Alternatives in 2026 (Tested & Reviewed) — Brilo AI | AI Phone & Voice Agent For Businesses, accessed on May 31, 2026, https://www.brilo.ai/resources/sprinklr-alternatives
28. Compare Salesforce Service Cloud Software vs. Sprinklr Social | G2, accessed on May 31, 2026, https://www.g2.com/compare/agentforce-service-formerly-salesforce-service-cloud-vs-sprinklr-social
29. Sprout vs Sprinklr Integration | Salesforce Trailblazer Community — Trailhead, accessed on May 31, 2026, https://trailhead.salesforce.com/trailblazer-community/feed/0D54V00007clYNESA2
30. Automotive leader builds proactive outreach program to surprise and delight customers — Sprinklr, accessed on May 31, 2026, https://www.sprinklr.com/stories/global-auto-manufacturer/
31. Top Automotive Brand Enhances CX with VoC Data and Real-Time Insights | Sprinklr, accessed on May 31, 2026, https://www.sprinklr.com/stories/top-automotive-brand/
32. Integration Guides | Sprinklr Help Center, accessed on May 31, 2026, https://www.sprinklr.com/help/categories/integration-guides/633c5c99a5d73616a985d88f
33. Mercedes & Zoho launch 'SkyLine' — a made-in-India Dealer Management System — Team-BHP, accessed on May 31, 2026, https://www.team-bhp.com/forum/indian-car-scene/301159-mercedes-zoho-launch-skyline-made-india-dealer-management-system.html
34. Car dealership and automotive solutions software — Zoho CRM, accessed on May 31, 2026, https://www.zoho.com/crm/solutions/automotive-crm/
35. Automotive CRM — Zoho, accessed on May 31, 2026, https://www.zoho.com/crm/verticals/automotive-crm/
36. Zoho CommandCenter: Manage dealer purchase journeys, accessed on May 31, 2026, https://www.zoho.com/crm/dealer-logistics-journey.html
37. What is Social CRM? | Social Media CRM Tool & Strategies — Zoho CRM, accessed on May 31, 2026, https://www.zoho.com/crm/social-crm.html
38. Botsense: WhatsApp API & AI Calling Software India, accessed on May 31, 2026, https://botsense.io/
39. WhatsApp Automotive Automation | Test Drives, Service & Sales — Mark360.ai, accessed on May 31, 2026, https://mark360.ai/solutions/automotive
40. WhatsApp Business CRM Integration: Complete Guide for Indian, accessed on May 31, 2026, https://converse.so/blog/whatsapp-business-crm-integration
41. What is a Product Requirements Document (PRD)? — Agile — Atlassian, accessed on May 31, 2026, https://www.atlassian.com/agile/product-management/requirements
42. How to Write An Effective Product Requirements Document (PRD) — Jama Software, accessed on May 31, 2026, https://www.jamasoftware.com/requirements-management-guide/writing-requirements/how-to-write-an-effective-product-requirements-document/
43. PRD Template: Guide for Product Managers — Userpilot, accessed on May 31, 2026, https://userpilot.com/blog/prd-template/
44. The Ultimate Product Requirements Template for Product Teams | by Nima Torabi — Medium, accessed on May 31, 2026, https://medium.com/beyond-the-build/the-ultimate-product-requirements-template-for-product-teams-7d95edec6432
45. Writing PRDs and product requirements | by Carlin Yuen — Medium, accessed on May 31, 2026, https://carlinyuen.medium.com/writing-prds-and-product-requirements-2effdb9c6def
46. The Only PRD Template You Need (with Example) — Product School, accessed on May 31, 2026, https://productschool.com/blog/product-strategy/product-template-requirements-document-prd
47. Reddit! What is the best PRD template and why you like it? : r/ProductManagement, accessed on May 31, 2026, https://www.reddit.com/r/ProductManagement/comments/1rp8byj/reddit_what_is_the_best_prd_template_and_why_you/
48. Product Requirements Document Example: 7 Real PRDs — Figr, accessed on May 31, 2026, https://figr.design/blog/product-requirements-document-example
49. Free Product Requirements Document (PRD) Template | Confluence — Atlassian, accessed on May 31, 2026, https://www.atlassian.com/software/confluence/templates/product-requirements
50. CRM Requirements Checklist 2026 — Brevo, accessed on May 31, 2026, https://www.brevo.com/blog/crm-requirements/
51. Assessing Your CRM Requirements: Key Steps and Checklist, accessed on May 31, 2026, https://www.choosemycrm.com/crm-requirements-assessment-and-checklist/

---

*"Specifications are the source of truth, not code." — BHIL*
