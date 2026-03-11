  
PRODUCT REQUIREMENTS DOCUMENT

**Video Content Ontology &**

**Knowledge Base Platform**

*Transforming video content into structured intelligence*

*for community engagement, thought leadership, and brand growth*

| Version | 1.0 |
| :---- | :---- |
| **Date** | 11 March 2026 |
| **Author** | Agentics Foundation |
| **Status** | Draft — For Alignment |
| **Classification** | Internal |

# **Table of Contents**

# **1\. Executive Summary**

The Agentics Foundation produces a growing library of video content capturing discussions, demonstrations, and thought leadership across the agentic AI ecosystem. This content represents significant institutional knowledge, but today it exists as unstructured media — difficult to search, cross-reference, or repurpose at scale.

This PRD defines a platform that transforms video content into a structured, AI-queryable knowledge base built on a domain-specific ontology. The platform will serve three strategic objectives: keeping community members informed about foundation activities and discussions, generating thought leadership and marketing material grounded in real community discourse, and improving the foundation’s brand awareness and recognition in the agentic AI industry.

The system will ingest video content from Kaltura, extract and enrich transcripts using AI, map content to a formal ontology, and expose the structured knowledge through APIs and applications that serve both internal teams and the broader community.

# **2\. Problem Statement**

## **2.1 Current State**

* Video content is stored in Kaltura but exists as opaque media files with minimal metadata beyond titles and dates

* Community members must watch entire recordings to find relevant information, creating a high friction barrier to engagement

* Cross-referencing ideas, speakers, or themes across multiple videos requires manual effort that nobody undertakes systematically

* Marketing and communications teams lack structured source material for creating thought leadership content

* Institutional knowledge captured in video discussions is effectively lost once the recording ends

## **2.2 Desired State**

* Every video is automatically transcribed, semantically enriched, and mapped to a structured ontology within hours of publication

* Community members can search across all content by topic, speaker, technology, or concept and jump directly to relevant moments

* Applications can surface personalised updates, weekly digests, and topic-specific briefings automatically

* Content teams can query the knowledge base to identify strong quotes, emerging themes, and narrative arcs for thought leadership material

* The foundation has a living, queryable record of its intellectual output that grows richer over time

# **3\. Goals & Success Metrics**

| Goal | Success Metric | Target |
| :---- | :---- | :---- |
| Community engagement | Weekly active users querying the knowledge base | 50+ within 3 months of launch |
| Content discovery | Average time to find a relevant video segment | Under 30 seconds (vs. manual browsing) |
| Thought leadership output | Published pieces sourced from knowledge base per month | 4+ articles or posts |
| Brand awareness | Inbound mentions and shares of foundation content | 2x increase within 6 months |
| Knowledge coverage | Percentage of videos processed and indexed | 100% within 48 hours of publication |
| Ontology richness | Named entities and relationships in the knowledge graph | 500+ entities within 3 months |

# **4\. Ontology Design**

The ontology provides the formal structure for organising video content into a queryable knowledge base. It defines entity types, their attributes, and the relationships between them. The design must balance domain specificity (capturing the nuances of agentic AI discourse) with extensibility (accommodating topics and structures not yet anticipated).

## **4.1 Core Entity Types**

| Entity Type | Description | Example Attributes |
| :---- | :---- | :---- |
| Person | Speakers, panellists, and referenced individuals | Name, role, organisation, expertise areas, Kaltura contributor ID |
| Organisation | Companies, research labs, foundations, open-source projects | Name, type, domain, website, relationship to foundation |
| Technology | Specific tools, frameworks, platforms, and protocols | Name, version, category, maturity level, licence |
| Concept | Abstract ideas, methodologies, architectural patterns | Name, definition, related concepts, first-mentioned date |
| Event | Recorded sessions, webinars, panel discussions | Title, date, duration, participants, Kaltura entry ID, format |
| Topic | Thematic categories that group related discussions | Name, parent topic, description, related entities |
| Claim | Specific assertions, predictions, or positions taken by speakers | Statement, speaker, timestamp, confidence, evidence cited |
| Demo | Product demonstrations or technical walkthroughs shown in video | Title, technology, timestamp range, speaker, outcome |

## **4.2 Relationship Types**

Entities are connected through typed, directional relationships that capture how knowledge is structured across the video corpus.

| Relationship | From → To | Properties |
| :---- | :---- | :---- |
| DISCUSSES | Person → Concept/Technology | Timestamp, sentiment, depth (mention vs. deep-dive) |
| DEMONSTRATES | Person → Technology | Timestamp range, outcome (success/partial/failure) |
| AFFILIATED\_WITH | Person → Organisation | Role, period, current flag |
| BUILDS\_ON | Concept → Concept | Relationship type (extends/contradicts/refines) |
| DEPENDS\_ON | Technology → Technology | Dependency type (runtime/build/optional) |
| PART\_OF | Topic → Topic | Hierarchical parent-child relationship |
| ASSERTS | Person → Claim | Timestamp, video entry ID, confidence |
| RESPONDS\_TO | Claim → Claim | Agreement/disagreement/refinement |
| FEATURED\_IN | Entity → Event | Timestamp range, role (primary/supporting/mentioned) |

## **4.3 Temporal & Provenance Layer**

Every fact in the knowledge base carries provenance metadata linking it back to a specific moment in a specific video. This includes the Kaltura entry ID, the timestamp (in seconds, enabling deep-link URLs), the speaker if identifiable, and a confidence score reflecting extraction certainty. This provenance chain ensures that any insight, summary, or marketing claim can be traced back to its source material with a single click.

## **4.4 Taxonomy Hierarchy**

Based on analysis of recent video content, the initial topic taxonomy includes the following top-level categories, each with sub-topics to be refined during the extraction phase:

* **Agentic AI Systems:** Agent architectures, multi-agent coordination, emergent behaviour, tool use, autonomy levels

* **Medical & Health Applications:** WiFi-based detection, diagnostic AI, clinical workflows, patient monitoring, regulatory considerations

* **Infrastructure & Tooling:** MCP servers, API design, deployment patterns, observability, security, edge computing

* **Community & Ecosystem:** Foundation governance, member projects, partnerships, events, working groups

* **Industry & Market:** Competitive landscape, investment trends, regulatory environment, enterprise adoption, open-source dynamics

* **Philosophy & Ethics:** AI alignment, human-AI interaction, autonomy boundaries, responsible development, societal impact

# **5\. System Architecture**

## **5.1 High-Level Pipeline**

The system operates as a five-stage pipeline, each stage building on the output of the previous one.

| Stage | Process | Input → Output |
| :---- | :---- | :---- |
| 1\. Ingestion | Pull new videos and metadata from Kaltura via MCP/API on a scheduled basis | Kaltura API → Raw video metadata \+ transcript (SRT/caption assets) |
| 2\. Transcript Processing | Parse SRT captions, merge into analysable chunks (\~45s segments), correct technical terminology, attempt speaker diarisation | Raw SRT → Cleaned, chunked, speaker-attributed transcript |
| 3\. Entity & Relationship Extraction | LLM pass over each chunk to identify entities, classify topics, extract claims, and detect relationships | Transcript chunks → Structured JSON (entities, relationships, claims) |
| 4\. Ontology Mapping & Enrichment | Deduplicate entities, resolve co-references, merge with existing knowledge graph, validate taxonomy placement | Extracted JSON → Updated knowledge graph |
| 5\. Application Layer | Expose structured knowledge through APIs, search interfaces, digest generators, and content creation tools | Knowledge graph → User-facing applications and outputs |

## **5.2 Technology Stack (Proposed)**

| Component | Technology | Rationale |
| :---- | :---- | :---- |
| Video Platform | Kaltura (existing) | Already deployed; MCP server provides API access to metadata, captions, and analytics |
| Knowledge Graph | Neo4j or similar graph DB | Native support for typed relationships; Cypher query language maps well to ontology queries |
| Vector Store | Pgvector or Pinecone | Enables semantic search over transcript embeddings for natural language queries |
| LLM Processing | Claude API (Anthropic) | Strong performance on entity extraction, summarisation, and structured output generation |
| Orchestration | n8n or custom pipeline | Scheduled ingestion, processing workflows, error handling, and monitoring |
| API Layer | REST/GraphQL API | Serves applications, digest generators, and third-party integrations |
| Frontend | Web application (React) | Community-facing search, browse, and discovery interface |

## **5.3 Data Flow Diagram**

The data flows from Kaltura through the processing pipeline into the knowledge graph, with the application layer reading from the graph to serve multiple output channels. A feedback loop allows human reviewers to correct extraction errors, which improves the LLM prompts over time.

# **6\. Application Layer & Use Cases**

The knowledge base serves multiple downstream applications, each drawing on the same structured ontology but presenting information differently for different audiences and purposes.

## **6.1 Community Engagement Applications**

* **Weekly Digest Generator:** Automatically produces a summary of the past week’s video content, organised by topic, highlighting new concepts introduced, key claims made, and notable demonstrations. Delivered via email or community platform.

* **Semantic Search Interface:** Natural language search across the entire video corpus. Members ask questions like “What has the foundation discussed about medical AI?” and receive timestamped, deep-linked answers with source video context.

* **Topic Explorer:** Interactive browse experience organised by the ontology’s topic taxonomy. Members can drill from broad themes down to specific discussions, speakers, and video moments.

* **Personalised Recommendations:** Based on a member’s viewing history or stated interests, surface relevant segments from videos they haven’t seen. Alert members when new content touches their areas of interest.

## **6.2 Thought Leadership & Marketing Applications**

* **Quote & Soundbite Finder:** Query the knowledge base for the most compelling claims, predictions, and insights on a given topic. Returns deep-linked timestamps and speaker attribution, ready for inclusion in articles or social posts.

* **Trend Analysis Dashboard:** Track how topics, technologies, and sentiment evolve over time across the video corpus. Identify emerging themes before they become mainstream talking points.

* **Content Brief Generator:** Given a target topic or theme, automatically produce a content brief that includes key arguments from the video corpus, relevant speaker quotes, related topics for cross-linking, and suggested narrative angles.

* **Social Media Content Pipeline:** Extract short-form insights, pair them with video clip timestamps, and generate draft social posts with proper attribution and deep-links back to source material.

## **6.3 Internal Knowledge Management**

* **Speaker Intelligence:** Profile each contributor across all their video appearances: topics discussed, positions taken, expertise areas, collaboration patterns. Useful for event planning and panel composition.

* **Gap Analysis:** Identify topics that the community has not yet covered or areas where coverage is thin. Informs content strategy and session planning for future events.

* **Contradiction & Evolution Tracker:** Flag instances where speakers or the community’s position on a topic has shifted over time. Valuable for understanding how thinking evolves.

# **7\. Phased Delivery Plan**

## **7.1 Phase 1: Foundation (Weeks 1–4)**

Establish the extraction pipeline and draft ontology using the existing 30-day video corpus as the working dataset.

* Ingest all videos from the last 30 days via Kaltura MCP (metadata, transcripts, analytics)

* Build transcript processing pipeline: SRT parsing, chunking, terminology correction

* Run initial entity and topic extraction across all transcripts using LLM

* Produce draft ontology schema and validate against extracted data

* Deliver: working extraction pipeline, draft ontology document, initial knowledge graph with 30 days of content

**Exit criteria:** All videos from the past 30 days are processed, entities are extracted with \>85% precision on manual review of a sample set, and the ontology schema covers \>90% of extracted entities without requiring “uncategorised” labels.

## **7.2 Phase 2: Enrichment & Search (Weeks 5–8)**

Add relationship extraction, semantic search, and the community-facing discovery interface.

* Implement relationship extraction between entities (speaker-topic, concept-concept, technology dependencies)

* Build vector embeddings for transcript chunks and entity descriptions

* Deploy semantic search API with natural language query support

* Create basic web interface for search and topic browsing

* Implement automated ingestion pipeline for new videos (scheduled, not manual)

**Exit criteria:** Community members can search the knowledge base by natural language query and receive relevant, timestamped results. New videos are automatically processed within 24 hours of publication.

## **7.3 Phase 3: Content Generation (Weeks 9–12)**

Deliver the thought leadership and marketing content tools.

* Build weekly digest generator with configurable templates and audience segmentation

* Implement quote/soundbite finder with deep-linked timestamps

* Create content brief generator for marketing and communications team

* Build trend analysis dashboard showing topic evolution over time

* Deploy social media content pipeline with draft post generation

**Exit criteria:** First automated weekly digest is sent to community members. Marketing team has produced at least two thought leadership pieces using the content brief generator. Social media pipeline is producing draft posts for review.

## **7.4 Phase 4: Intelligence & Scale (Weeks 13–16)**

Add advanced analytics, personalisation, and feedback loops.

* Implement personalised recommendation engine based on member interests and viewing history

* Build speaker intelligence profiles and gap analysis tools

* Add contradiction and evolution tracking across the corpus

* Implement human-in-the-loop feedback system to improve extraction quality

* Performance optimisation and scalability testing for growing corpus

**Exit criteria:** Personalised recommendations are served to opted-in members. Extraction quality has improved measurably from Phase 1 baseline through feedback loop corrections.

# **8\. Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| :---- | :---- | :---- | :---- |
| Transcript quality (auto-generated captions) | High — domain-specific terms mangled | High | Build a domain-specific correction dictionary; human review sample for each new video; track error rate over time |
| Speaker identification unavailable in captions | Medium — limits attribution accuracy | High | Use contextual clues and video metadata; explore diarisation services; allow manual tagging in review interface |
| Ontology drift as new topics emerge | Medium — new content doesn’t fit existing categories | Medium | Design taxonomy with explicit extension points; quarterly ontology review; automated flagging of uncategorised entities |
| LLM hallucination in entity extraction | High — incorrect facts in knowledge base | Medium | Confidence scoring on all extractions; human review for low-confidence items; provenance links enable rapid correction |
| Low community adoption | High — investment not justified | Low | Early alpha testing with engaged members; iterate based on usage patterns; ensure immediate value via search and digests |
| Data privacy concerns around speaker profiling | Medium — reputational risk | Low | All content already public via Kaltura; speaker profiles use only publicly available information; opt-out mechanism for contributors |

# **9\. Dependencies & Assumptions**

## **9.1 Dependencies**

* Continued access to Kaltura MCP server and API (Partner ID: 5896392\) for video metadata and caption retrieval

* Kaltura caption/transcript assets are available for all videos (either auto-generated or manually uploaded)

* Claude API or equivalent LLM access for entity extraction and content generation workloads

* Infrastructure provisioning for knowledge graph database, vector store, and application hosting

* Design and frontend development resource for community-facing search interface

## **9.2 Assumptions**

* Video content is published in English; multilingual support is out of scope for Phase 1–4

* Auto-generated captions are available for the majority of videos; videos without captions will be flagged but not blocked

* The foundation has rights to process, index, and surface content from all Kaltura-hosted videos

* Community members will access the platform via web browser; native mobile applications are out of scope

* The existing Kaltura MediaSpace domain (video.agentics.org) will continue to serve as the canonical video URL base

# **10\. Out of Scope (This Version)**

* Real-time live stream processing (only post-publication ingestion)

* Video editing or clip creation tooling (the platform identifies segments; editing is a downstream workflow)

* Multilingual transcript processing and translation

* Mobile native applications (web responsive only)

* Integration with external knowledge bases or third-party content sources

* Automated video thumbnail or visual content analysis (text/audio transcripts only)

# **11\. Open Questions for Alignment**

The following questions require input from stakeholders before finalising the technical approach:

1. Knowledge graph technology: Should we use a dedicated graph database (Neo4j) or build on an existing data platform the foundation already operates?

2. Speaker identification: Is manual speaker tagging acceptable for Phase 1, or should we invest in automated diarisation from the start?

3. Community access model: Should the search interface be publicly accessible, or restricted to foundation members?

4. Content approval workflow: Should AI-generated digests and content briefs publish directly, or go through a human review stage?

5. Historical backfill: How far back should we process the video archive? 30 days is the starting point — what is the target?

6. Integration priorities: Beyond Kaltura, are there other content sources (Slack, documents, blog posts) that should feed into the knowledge base in future phases?

7. Hosting and infrastructure: Does the foundation have existing cloud infrastructure preferences (AWS, GCP, Azure) or should we recommend based on technical fit?

# **12\. Appendix: Validated Technical Capabilities**

The following capabilities have been validated through proof-of-concept work conducted during the initial discovery phase:

* **Kaltura MCP Integration:** Successfully retrieved video metadata, analytics, and caption assets for 8 videos via the Kaltura MCP server tools

* **Transcript Extraction & Parsing:** Extracted and parsed 2,513 SRT caption segments (193K+ characters) from a 117-minute video, merging into 168 analysable chunks

* **AI-Powered Content Analysis:** Identified 22 highlight segments across 6 thematic categories from a single video transcript using LLM analysis

* **Deep-Link URL Generation:** Generated working Kaltura deep-link URLs with timestamp parameters (?st=seconds) and thumbnail API URLs (vid\_sec parameter) for all identified segments

* **Thematic Categorisation:** Successfully categorised video content into themes including agentic AI philosophy, medical applications, emergent agent behaviour, tooling demonstrations, and technical deep dives

These validated capabilities form the technical foundation for the full pipeline described in this PRD. The proof-of-concept outputs (video highlights table and highlights reel segment guide) are available as reference deliverables.