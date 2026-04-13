import type { ArtifactInput, LoopFixture } from './contracts'
import { toWorkspaceSlug } from './slug'

export const DEMO_ARTIFACTS: ArtifactInput[] = [
  {
    title: 'Master Services Agreement and SOW',
    source: 'Dropbox / signed SOW',
    kind: 'contract',
    createdAt: '2026-03-02T09:00:00.000Z',
    content: `
Client: Coda Health
Project: Northstar Studio Website Replatform

Scope of work
- Redesign the marketing site and deliver three CMS-backed page templates.
- Implement one HubSpot lead capture form flow.
- Build one analytics dashboard summarizing traffic, campaign attribution, and form conversions.
- Include two rounds of revisions for approved page concepts.

Commercials
- Fixed project fee: $18,000
- Additional work beyond agreed scope billed at $165 per hour
- Third revision round or net-new deliverables require written change order approval

Out of scope / exclusions
- Authentication, gated partner portals, or member-only experiences
- AI assistants, chatbots, or knowledge agents
- CRM bidirectional syncs, custom webhooks, or Salesforce integrations
- Ongoing content maintenance, email nurture programs, or support retainers
`,
  },
  {
    title: 'Kickoff notes',
    source: 'Notion / meeting capture',
    kind: 'meeting_note',
    createdAt: '2026-03-06T12:30:00.000Z',
    content: `
Client requested one more surprise item after kickoff:
- Explore a gated partner onboarding flow so regional resellers can log in and download launch kits.
- Team also wants the analytics dashboard to include mobile drill-downs for country managers.
- They mentioned maybe spinning up a lightweight AI FAQ assistant if copy is ready in time.
`,
  },
  {
    title: 'Client Slack thread - March expansion asks',
    source: 'Slack export',
    kind: 'client_message',
    createdAt: '2026-03-11T08:12:00.000Z',
    content: `
Can we add a partner portal login before launch?
If possible, let's wire HubSpot back to Salesforce so the sales ops team doesn't retype leads.
Also, I think we need a third revision pass on the homepage because the board wants another narrative direction.
`,
  },
  {
    title: 'Project board export',
    source: 'Linear CSV summary',
    kind: 'task_export',
    createdAt: '2026-03-18T17:20:00.000Z',
    content: `
Build gated onboarding flow for partners
Prototype AI FAQ assistant using approved launch docs
Create Salesforce sync spec and webhook retry logic
Produce mobile drill-down dashboard variant for country managers
Homepage revision v3 and copy reshuffle
`,
  },
  {
    title: 'Invoice #1048',
    source: 'QuickBooks PDF OCR',
    kind: 'invoice',
    createdAt: '2026-03-29T09:15:00.000Z',
    content: `
Invoice total: $18,000
Line item: Fixed project fee
Line item: Minor copy edits - 4 hours

No change order fees captured.
`,
  },
  {
    title: 'Delivery recap',
    source: 'Internal debrief',
    kind: 'delivery_note',
    createdAt: '2026-04-01T15:45:00.000Z',
    content: `
Delivered the core replatform, but the team also built an early partner portal shell, homepage revision round three,
dashboard drill-downs for regional managers, and a proof-of-concept AI FAQ assistant using launch materials.
`,
  },
]

export const LOOP_FIXTURES: LoopFixture[] = [
  {
    name: 'agency-expansion-leak',
    workspaceName: 'Northstar Studio',
    artifacts: DEMO_ARTIFACTS,
    expectedCategories: [
      'portal_access',
      'ai_assistant',
      'data_sync',
      'revision_overrun',
      'analytics_expansion',
    ],
    minimumRecoveredRevenue: 12000,
  },
  {
    name: 'msp-maintenance-creep',
    workspaceName: 'Meridian MSP',
    expectedCategories: ['maintenance_tail', 'new_deliverable'],
    minimumRecoveredRevenue: 5000,
    artifacts: [
      {
        title: 'MSP statement of work',
        source: 'Google Drive',
        kind: 'contract',
        createdAt: '2026-02-01T10:00:00.000Z',
        content: `
Client: Vantage Dental
Project: Q1 infrastructure refresh

Deliverables
- Replace office firewalls in four locations
- Configure endpoint monitoring and weekly backup checks

Commercials
- Fixed project fee: $9,500
- Additional support work billed at $145 per hour

Out of scope
- Ongoing after-hours helpdesk, printer support, and ad hoc device onboarding
`,
      },
      {
        title: 'Support recap',
        source: 'Shared inbox export',
        kind: 'client_message',
        createdAt: '2026-02-21T16:00:00.000Z',
        content: `
Thanks for jumping on all those evening printer issues and onboarding the 12 new iPads.
Can you keep covering after-hours helpdesk until we hire?
`,
      },
      {
        title: 'February invoice',
        source: 'Xero PDF OCR',
        kind: 'invoice',
        createdAt: '2026-02-28T09:00:00.000Z',
        content: `
Invoice total: $9,500
Only the fixed project fee was billed.
`,
      },
    ],
  },
  {
    name: 'revops-implementation-drift',
    workspaceName: 'Atlas RevOps Lab',
    expectedCategories: ['data_sync', 'maintenance_tail', 'new_deliverable'],
    minimumRecoveredRevenue: 9000,
    artifacts: [
      {
        title: 'Implementation SOW',
        source: 'Signed PDF',
        kind: 'contract',
        createdAt: '2026-01-10T10:00:00.000Z',
        content: `
Client: Halcyon Robotics
Project: Revenue operations implementation

Deliverables
- Implement one HubSpot lifecycle pipeline and lead routing flow
- Configure weekly marketing and sales performance reporting
- Run launch enablement for one operations team

Commercials
- Fixed project fee: $24,000
- Additional implementation work billed at $185 per hour

Out of scope
- Salesforce bidirectional syncs, custom webhook retry logic, or downstream ERP integrations
- Ongoing weekly admin support, after-hours triage, or recurring reporting changes
- Net-new onboarding portals, microsites, or distributor launch kits
`,
      },
      {
        title: 'Steering committee notes',
        source: 'Notion',
        kind: 'meeting_note',
        createdAt: '2026-01-17T15:00:00.000Z',
        content: `
- Leadership wants a distributor onboarding microsite for channel partners if launch pacing allows.
- The revops team asked whether the HubSpot workflow can sync qualified leads back to Salesforce with failure alerts.
- We may need weekly support after go-live while the new team ramps.
`,
      },
      {
        title: 'Client email - launch asks',
        source: 'Gmail export',
        kind: 'client_message',
        createdAt: '2026-01-24T08:20:00.000Z',
        content: `
Can you keep cleaning the pipeline every Friday for the first two months after launch?
Also, we'd love to add the distributor onboarding microsite before field kickoff.
Let's make sure the Salesforce sync is resilient enough that ops gets alerted if records fail.
`,
      },
      {
        title: 'Implementation board',
        source: 'Asana export',
        kind: 'task_export',
        createdAt: '2026-02-02T12:40:00.000Z',
        content: `
Build Salesforce sync monitoring and retry workflow
Create distributor onboarding microsite shell and launch kit pages
Run weekly post-launch pipeline clean-up and admin support
`,
      },
      {
        title: 'Launch recap',
        source: 'Internal recap',
        kind: 'delivery_note',
        createdAt: '2026-02-18T18:10:00.000Z',
        content: `
The team shipped the sync retry workflow, stood up the distributor onboarding microsite draft, and kept covering weekly pipeline cleanup after launch.
`,
      },
    ],
  },
]

export function getFixtureByWorkspaceSlug(slug: string): LoopFixture | undefined {
  return LOOP_FIXTURES.find((fixture) => toWorkspaceSlug(fixture.workspaceName) === slug)
}
