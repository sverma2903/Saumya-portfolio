/**
 * alt.ts · WP7 (SPEC §7.1 1.1.1, §8.9 item 2). Alt-text DRAFTS for every image, GIF and video the site renders, keyed by
 * media file name. Each was written by looking at the file itself (every frame strip for GIFs and videos), not from her
 * captions: a draft says what is visible, quotes text that appears inside the image exactly (with her own spelling and
 * punctuation), and never paraphrases her captions or adjacent sentences as if they were hers.
 *
 * STATUS: drafts for the owner's review. Nothing here is her copy; Saumya signs these off (or edits them) before launch.
 * `node tools/alt-draft.mjs --sheet` renders qa/alt-review.html (each image beside its draft and where it is used).
 *
 * `alt(file)` returns the draft, or '' when there is none. '' stays the right value where a component shows a file as a
 * decorative duplicate (the home Viewport and index cards repeat a case cover described on its sheet; the backdrop layer
 * under a cover; card logos inside a link that already names the project). Those components pass '' themselves; the
 * drafts below still cover every file, so a future placement that is not decorative has one.
 *
 * Grouped by the first page that shows each file, in reading order; the comment names the figure or block.
 */
export const ALT_STATUS = 'draft · pending owner sign-off (SPEC §8.9 item 2)' as const;

export const altDrafts: Record<string, string> = {
  // ─── Home (A-000) · cover plates, card logos, Viewport ───
  // A-101 · Cover · cover · also cloudflare, educademy
  'ynF3JX3AYbXmF5u4ZKwl04aGc.png':
    'Laptop showing the redesigned R2 Analytics page in the Cloudflare dashboard: four metric cards (total storage, object count, Class A and Class B operations) with sparklines, a bar chart of storage by class, a world map of requests by region, and a table of requests per bucket.',
  // A-101 card logo (inside the card link: rendered decorative)
  'CQBzyCCtXm6Sxa1H7rjdmW35A4.webp':
    'Cloudflare logo: an orange cloud above the dark grey CLOUDFLARE wordmark.',
  // A-102 · Cover · cover · also cloudflare, pff
  'NfispiNGsXrWqGyPllkA6wjliKo.png':
    'A phone screen and a desktop screen from the mission assignment tool. The phone lists mission assignments for Hurricane Helene with amounts, dates and status tags (Draft, In Review, Returned, Rejected, Approved). The desktop greets “Hello Sarah,” above a table of assigned tasks with status tags and a row of quick actions.',
  // A-102 card logo (inside the card link: rendered decorative)
  'LLwKJhf5XlV3SWhOs3xldIRQFA.png':
    'PFF LLC logo: a yellow and black “pff” monogram beside “LLC”, with the tagline “bridging the gap”.',
  // A-103 · Cover · cover · also pff, csbs
  'hc5LSNViBiB98sAACx272BNZYw.gif':
    'Animation on a blue background. The word “Before” types out above a screenshot of the old NMLS Resource Center home page, with its news columns and lists of links; it is then retyped as “After” above the redesigned CSBS Knowledge Center page for NMLS, with a side navigation, five icon links to resource centers and short link lists under each.',
  // A-103 card logo (inside the card link: rendered decorative)
  'o8ini5inZ7izIUkXDxD6Ryd890E.png':
    'CSBS logo: the letters C, S, B and S in white on four blue tiles.',
  // A-104 · Cover · cover · also csbs, u-up
  'y8vKVnSvce5bLvmSJjZXBbMPNWU.png':
    'Three phones with dark screens from the U-Up app: a starburst of glowing, connected points under the user’s keywords (Anxious, Nervous, Job), noting that 50 people in the area feel the same right now; a one-to-one chat headed “Talk with B-153”; and a prompt asking what is causing the feeling, with keyword chips and a typed answer.',
  // A-104 card logo (inside the card link: rendered decorative)
  'z9qKmfXnKpQ01CHNuHDM1KgY6aE.png':
    'Carnegie Mellon University wordmark in red serif letters.',
  // A-105 cover backdrop, the bottom layer under the laptop (rendered decorative) · also u-up, orbit, fun
  'T8tenCXKluVSCNxnIJ2yBvycmw.jpg':
    'Dusty rose background with darker tone-on-tone shapes: a rounded square, a circle, a triangle and a scalloped gear.',
  // A-105 · Cover (top layer) · Play FIG. 4 · also u-up, orbit, fun
  'IJYwPa4qI0oYO2wGbVxyxwzlZOM.png':
    'Laptop showing the Orbit dashboard in a browser: a monthly summary of 67 hours of teaching, 32 hours of service and 20 hours of research, a warning that service hours are above the target, and bars comparing each area’s current share with its target.',
  // A-106 · Cover · cover · also orbit, educademy
  'J07qObGcr5c64oNlhZc7sblQE.png':
    'Four phones from the Educademy app: a purple splash screen with the name and “Homeschooling made easy.”; a “Get started!” screen with Sign In and Sign Up buttons; a parent’s home screen greeting Sophie, with upcoming assignments and resources; and an assignment’s details with the child’s status (opened, submitted, not checked).',
  // B-100 portrait (About header) · home B-100 row · also about
  'AIv5iYq94P5wgTfviYYCQf5ATw.png':
    'Portrait of Saumya, smiling, with long dark hair and a black blazer, in front of a granite wall and large monstera leaves; the photo sits on a tilted orange card.',
  // C-100 · Play FIG. 1 · home C-100 row · also fun
  'GHjG21Lo2f64p4k0y3obKTFGgck.mp4':
    'Phone screen recording of an hourglass timer: sand in shifting colours, peach to lavender to pink, drains while a session clock runs to 45:04. The session is ended, the screen asks “How long did that feel?”, and the user lifts the sand to mark 60 minutes before a “Check my report” button appears.',
  // ─── Cloudflare (A-101) ───
  // Competitive Analysis
  'IVrPyYYRJLjhPvlS4eSOwn52NaE.png':
    'Cloudflare R2 icon: an orange database cylinder.',
  // Competitive Analysis
  'dUwbvv6u6jFTHPAMxvRVVm3zjM.png':
    'Amazon S3 logo: red geometric blocks above the words “Amazon S3”.',
  // Competitive Analysis
  'rdJoAbUz5W5JY800YfSnkWN6Y78.png':
    'Google Cloud Storage icon: two stacked storage drives outlined in red, yellow, blue and green.',
  // Competitive Analysis
  '9uBbVl51RJXMQ6qhyQ60x39Uo.png':
    'Backblaze B2 logo: a red flame above the Backblaze B2 wordmark.',
  // FIG. 2.2 · Interviews
  'EDfAP8bTFuMCt3cCBqfGA9T7SP4.jpg':
    'Screenshot from a remote interview: the Cloudflare R2 dashboard open on a bucket named “aegis-uploads”, showing its storage class, public access, bucket size, Class A and Class B operation counts and a list of stored files, with a Google Meet call window in the lower right corner.',
  // FIG. 3.1a · Personas
  'ah6Xf97OKA9xBM9n64Z5qtdWmQg.jpg':
    'Persona card on peach, with a memoji of a young man in glasses and a backpack. It reads: “Sam, the builder. Sam builds systems on top of R2. He has wired R2 into his stack through Workers bindings or direct API calls, and once the pipeline works, they rarely touch the dashboard. They visit during initial setup, then sporadically for billing checks and troubleshooting. Needs: Knowledge that his automated system is behaving correctly (trending storage, bindings, request volumes over time) and what it\'s costing him. Frustrations: "Class A Operations" means nothing to them even though they\'re engineers. They think in terms of reads, writes, and dollars. They also find token management painful. The S3 API token flow is scattered across multiple pages.”',
  // FIG. 3.1b · Personas
  'yLHVdvapLHy1NeiXIk5N40FOF8.jpg':
    'Persona card on cream, with a memoji of an older man in glasses, suit and tie. It reads: “Mike, the administrator. Mike manages R2 at an organizational level. He manages access for teams, configures permissions, handles custom domains, and needs analytics that he can share with clients. He uses the console regularly for administrative operations like creating tokens, checking data, and managing configurations. Needs: His core need is granular control. He wants per-bucket permissions (restricting who can access what data) and private custom domains. Frustrations: R2\'s permission model is flat. He can\'t restrict access at the bucket level. No separate client-facing analytics view where he can see usage patterns that he could potentially share with clients.”',
  // FIG. 3.2 · Configuration
  'WgCbjKzHjiwauZbYEdrJmoKdl7Q.jpg':
    'Journey map headed 1. “If something happens in my bucket, I want my system to respond." An ACTIONS row of four boxes joined by arrows: “Create Bucket”, “Create Queue (Separate Window)”, “Go to Settings to add Event Notifications” and “Go to Workers to add binding”. Below, a PROBLEMS line starts above its baseline at “Bucket creation is lightweight, developers appreciate the minimal required fields.”, drops below it at “Connecting a bucket to a Queue requires navigating away from R2 entirely.”, touches it again at “The flow dead-ends. There\'s no way to see or create the Worker binding that will consume those notifications in R2.” and ends below it.',
  // FIG. 3.3 · Configuration
  'sudZxkOuimVHarWvtdxTiwKIfoc.jpg':
    'Journey map headed 2. "My Worker needs to read from or write to my bucket." An ACTIONS row of two boxes joined by an arrow: “Create Bucket” and “Go to Workers to add binding”. Below, a PROBLEMS line falls from above its baseline at “Bucket creation is lightweight, developers appreciate the minimal required fields.” to below it at “The bucket has no awareness of which Workers are bound to it. Developers must check each Worker individually to find bindings.”',
  // FIG. 3.4 · Configuration
  'gwd84tZNvsOf3CHmMADJctg6nA.jpg':
    'Journey map with an ACTIONS row of four boxes joined by arrows: “Create Bucket”, “Go to Bucket Settings to find S3 API endpoint”, “Navigate to R2 Homepage → Manage API Tokens” and “Create token”. Below, a PROBLEMS line falls from above its baseline at “Bucket creation is straightforward. No issues here.” to below it at “The information that belongs together (endpoint and token) lives in two completely unrelated parts of the dashboard.”, stays low, and climbs back to the baseline at “Bucket-scoped tokens exist but are so buried that 2 of 4 developers didn\'t know they were there.”',
  // FIG. 3.5 · Bucket Management
  'vrlXDHVMFZ6k5HGO4OudcarBBOc.jpg':
    'Annotated screenshot of the current R2 Object Storage home page: a list of buckets with object counts and sizes, usage figures for Class A and Class B operations and total storage, and an Account Details panel. Two callouts point into it: “Complex Bucket Deletion. No way to delete a bucket without manually deleting every object inside it first.” at the bucket list, and “Low-value clutter. No interviewee found Account ID useful enough to be added on the homepage.” at the Account ID row.',
  // FIG. 3.6 · Bucket Management
  'jaucYG0tkRPP0Yxyiy98VGTfEB8.jpg':
    'Annotated screenshot of the current R2 page for the bucket “aegis-uploads”: bucket facts along the top, Objects, Metrics and Settings tabs, and a list holding an “assets/” directory and two files. Two callouts point into it: “Directory downloads unavailable. No feature to download entire directory.” at the directory row, and “Drag and drop does not work. Missing baseline interactions.” at the drag-and-drop line.',
  // Design Goals · card: Reduce internal configuration steps
  'Fn2fGJ6uoe9bJooiMcmTo9gBck.jpg':
    'Pictogram: a chain of four orange steps, with an arrow down to a chain of two.',
  // Design Goals · card: Make S3 credentials and per-bucket token creatio
  'PfY4jWqw2rBGvI6q8LxIjCKQw.jpg':
    'Pictogram: three orange tiles showing a key, an eye and the letters “API”.',
  // Design Goals · card: Fix foundational interactions
  'HmFCeblpCm7SzpCgHFrf8Yjfg.jpg':
    'Pictogram: an orange trash can beside a yellow folder with a download arrow.',
  // Design Goals · card: Replace opaque terminology with plain language
  'ySz4SWCgEuPuPs3PvYY04HQJVYU.jpg':
    'Pictogram: the labels “Class A” and “Class B”, with an arrow pointing to “Writes / $0.36”.',
  // Design Goals · card: Surface analytics with time-series trends in a d
  'YSEkGtGxXygwk0F5c8YGSb72qc.jpg':
    'Pictogram: an orange line chart whose data points rise and fall over time.',
  // Design Goals · card: Show which compute services depend on each bucke
  'WiZEDsRPJVHkrObAdvvQ0TEah5E.jpg':
    'Pictogram: one orange box branching out to three.',
  // FIG. 4.1 · Internal Configuration
  'HidTdRa7ANxckQkjLgegX1Htik.jpg':
    'Flow diagram: “Create Bucket” leads to “Add Bucket Integrations” (“Add bucket integrations in a separate tab or inline on the bucket page.”), which branches into “Event notifications” (“Connect bucket with Queue. Create a new Queue inline if none exists.”) and “Worker bindings” (“Connect worker with bucket. Shows existing Workers already bound to this bucket.”).',
  // FIG. 4.2 · Internal Configuration
  'Bzurjtq26LcmgkGSyO6oOLiI6UM.jpg':
    'Two grey wireframes of the page for “bucket-123”. Left: the Objects tab, with the file list above a Bucket Integrations panel: a node diagram linking worker-123 (Reads/Writes) to the bucket and the bucket (Notifications) to queue-123, a “+ Integration” node, and a table of the connected services. Right: the same panel on its own Integrations tab, with “View docs” and “Add Integration +” buttons.',
  // FIG. 4.3 · Internal Configuration
  'D8Mj6D7IrAziCVyRCrNil9l4lE.jpg':
    'Node diagram: a Worker node, “worker-123”, connects through “Reads/Writes” to the central “bucket-123”, which connects through “Notifications” to a Queue node, “queue-123”; a second branch ends at a “+ Integration” button.',
  // FIG. 4.4 · External Configuration (S3 API token connections)
  '5mrUEYppyJ1F9lFDkEXqgOJ09w.jpg':
    'Flow diagram of three boxes joined by arrows: “Create Bucket”; “Go to Bucket to find S3 API endpoint and shortcut to API Tokens” (“Locate the S3-compatible API endpoint URL and the API Tokens link in one place.”); and “Create token” (“Inside the token creation flow, the per-bucket token creation is better highlighted.”).',
  // FIG. 4.5 · External Configuration (S3 API token connections)
  'gvC62bM3UB1KKcNucYCZzDbuS88.jpg':
    'Two versions of the “Create Account API Token” form side by side. Left, the current form: token name, four permission options and a “Specify bucket(s)” choice between two plain radio buttons, with a callout reading “The "Specify bucket(s)" section had no visual hierarchy”. Right, the redesign as a dialog: the same permissions as bordered options and the bucket choice as two bordered options, “All buckets” and “Specific buckets”, above Cancel and “Create Account API Token” buttons.',
  // FIG. 4.6a · Analytics and Monitoring
  'X0xZsaG4ay0wrDS9K0KhSUHDc.jpg':
    'Metric card: “Class A (writes, lists, copies)” with the value 324, a 12.52% change and a sparkline with a single sharp spike.',
  // FIG. 4.6b · Analytics and Monitoring
  'csEDEwbynLWgcVEg3KKy0deu5gE.jpg':
    'Metric card: “Class B (reads)” with the value 107, a 4.73% change and a sparkline with a single sharp spike.',
  // FIG. 4.7 · Analytics and Monitoring
  'iaZFTmw1LjJ6sFQCiaDCjYl5wOU.jpg':
    'Grey wireframe of the R2 Analytics page: a bucket selector, refresh and date-range controls, four metric cards (total storage, object count, Class A and Class B operations) with sparklines, a bar chart of storage by class, a world map of requests by region, and a table of requests per bucket.',
  // FIG. 5.1 · Prototype · feature: Internal Configuration
  'xVY62d93p5rA2uqmmKmIQwjR8I.gif':
    'Screen recording on the Integrations tab of bucket-123, where a node diagram shows worker-123 reading and writing the bucket. “Add Integration” opens a dialog; Queue is chosen, the variable name “queue-123” is typed, a new queue is created from the dropdown and the event type “Creation of a new object” is selected. After “Add integration”, the diagram gains a Notifications link from the bucket to queue-123 and the table below lists the queue.',
  // FIG. 5.2 · Prototype · feature: External Configuration
  '0JYHrpqh8iEliclxggLD75ZEjk0.gif':
    'Screen recording on the overview of bucket-123: “Copy S3 API” shows a “Click to copy” tooltip, then “API Tokens” opens the list of account and user tokens. In “Create Account API Token”, Admin Read & Write is chosen, “Specific buckets” is selected with bucket-123 added, and the token is created; the Account API Tokens table then lists a new token applied to bucket-123.',
  // FIG. 5.3 · Prototype · feature: Management
  'aOQ6T1UV764GiQaZId5sGFokWHg.gif':
    'Screen recording on the redesigned R2 Object Storage home page: a bucket list with sizes, object counts, request counts and sparklines, beside usage cards and settings links. bucket-123 is checked and “Delete Bucket” turns red; a confirmation dialog, “Delete bucket-123?”, explains that the bucket is emptied and deleted in one permanent action. After confirming, a banner reads “bucket-123 was successfully deleted.” and the bucket is gone from the list.',
  // FIG. 5.4 · Prototype · feature: Monitoring
  'lR8M0Y29rJGG4GIE3nmmHsmo08.jpg':
    'Screenshot of the redesigned R2 Analytics page in the Cloudflare dashboard: a bucket selector, “R2 Pricing” and “Download” buttons and a 30-day range; four metric cards with sparklines (68.4 GB total storage, 215 objects, 324 Class A and 107 Class B operations); a bar chart of storage and object count by storage class; a world map of write requests by region; and a table of requests per bucket.',
  // ─── PFF (A-102) ───
  // InCEP Platform · card: Manual data entry slows workflows
  'I5fQkwJvaQFaVCr4PgTuan7u8.png':
    'Icon: a clock face.',
  // InCEP Platform · card: Error prone submissions
  '7632RhgBDL3t7Gk1dboXMWEU.png':
    'Icon: one node branching out to three.',
  // InCEP Platform · card: No visibility into approval status
  'iRlbgfkiP9wFgi1i25VuHfjQCpg.png':
    'Icon: an eye inside a viewfinder frame.',
  // FIG. 2.1 · Product Highlights
  '0OYkKGPTRRJtg5W9kzasPOReEE.png':
    'Side-by-side comparison. Left, labelled “Legacy InCEP system”: two dense screens from the U.S. Department of Health and Human Services’ InCEP tool, a cost-estimate form and a cost-estimate record with funding lines and attachments. Right, labelled “New Treasora system”: the redesigned “Create Cost Estimate” form on desktop and on a phone, each with an AI Recommendation panel suggesting $128,450 with high confidence, based on similar past mission assignments.',
  // FIG. 2.2 · Product Highlights
  '0lWQvXlWN92Ca4YkYqStcDEKY.gif':
    'Screen recording: from a home page greeting “Hello RanHit,” with a table of assigned tasks, the user opens the Mission Assignment list (status filters and a table of assignments for Hurricane Milton) and presses Create. On the “Create Mission Assignment” form, “Upload to Auto-Fill” fills in the MA number, event, resource request, incident number, state, region, action, program code, priority, agency and dates.',
  // FIG. 2.3 · Product Highlights
  'kDWwW64PagR7INZeCK4xW3Duw.mp4':
    'Screen recording: from the mission assignment form, the user creates a cost estimate for mission 36222EN-FL-HHS-ASPR-01 (event Helene) with an initial estimate of $1,034,368. For funding line #1, “11000 Salaries and Benefits” is chosen, and the Total field shows an AI Recommendation of $634,368 with high confidence, listing similar past mission assignments; it is accepted. For line #2, “21000 Travel”, the suggestion is $353,584 with low confidence and a note that no similar MAs were found.',
  // FIG. 2.4 · Product Highlights
  'TJ24G62X9MOl407PtXBovxgoWw.mp4':
    'Screen recording: an approver opens “MA & CE Approval”, a table of pending mission assignments and cost estimates, and reviews MA-2024-0001. A banner reads “AI review found 2 High issues, 2 Medium issues and 1 Low issue.”; an AI Findings Summary lists each issue, and choosing one highlights the related field in red (the program code, the statement of work). The approver presses Reject, and a “Rejection Reason” dialog asks for the reason and the required next steps before the rejection is confirmed.',
  // FIG. 2.5 · Product Highlights
  'Eh8LAs7UnxnzOIQPRHsvnBUH3c.mp4':
    'Screen recording: from the home page’s quick actions, the user opens “Create Transaction” and fills in a mission-assignment purchase: organization, date, a description of satellite communication equipment for the Hurricane Helene response, purchase details and an acquisition record. In the funding line, the Spend Plan Line menu flags one line with guidance for when to use it, and the Object Class Code menu marks “11000 Salaries and Benefits” as suggested from the expense description.',
  // FIG. 2.6 · Product Highlights
  'HuYD94DXbwjbqrO9Wx52NbnYB6Y.mp4':
    'Screen recording in Treasora: from the Finance menu the user opens the Budget Dashboard, with totals for cost estimate, obligation, spend and remaining budget above a stacked bar chart of budget use per mission assignment. Clicking a bar opens a side panel for MA-2026-001 with its budget details and a breakdown by funding line; a filter narrows the chart to Personnel; and an AI Insights chat answers “Which MA has the highest Cost Estimate?”.',
  // FIG. 3.1 · Competitor Analysis
  'cVgfb0s0hG7fYwQ76o8ctXWHqe8.png':
    'Logos of four products: a navy cube-and-bars mark shown without a name, OneStream, OpenGov and Euna Solutions.',
  // FIG. 3.2 · Mapping InCEP Workflows
  'pIpSTafpDbOaomutvkKp5sbo0.png':
    'Login screen of InCEP: a blue panel reading “Welcome to InCEP” with the U.S. Department of Health and Human Services seal and “Administration for Strategic Preparedness and Response”, beside a username and password form.',
  // Understanding User Needs · story: Financial Analyst
  'fcOBmTs2rsYyBZvOIwHLaP0.png':
    'Navy line illustration of a young man with short dark hair in a button-up shirt.',
  // Understanding User Needs · story: Requestor
  '93xfJ7BYpODYoVdbmzvCfqCKwWA.png':
    'Navy line illustration of a woman in a white hard hat and a work jacket.',
  // Understanding User Needs · story: Approver
  'fNS3SmfyKO1BF1WehuZiIZcBEM.png':
    'Navy line illustration of a woman in a blazer, with glasses pushed up on her head.',
  // Understanding User Needs · story: Director
  'bKGU2Gfm4HfJMtDQ9Z2iZnBE.png':
    'Navy line illustration of an older man with grey hair in a suit jacket and open-collared shirt.',
  // FIG. 3.3 · Organizational Workflow
  'VfuaSVxcN4BBEWYNZc33ZU6vds.jpg':
    'Workflow diagram. ACTIONS: “Emergency Event Occurs” (“E.g.: Hurricane Helene makes landfall”), then Financial Analyst (“Creates Mission Assignment with cost estimate and submits for approval”), MA/CE Approver (“Reviews and approves or rejects the Mission Assignment/Cost Estimate”), Requestor (“Submits transactions for approval and executes”) and Finance Approver (“Reviews and approves or rejects the Transaction”), with a Director above them all (“Monitors budget performance and ensures compliance”). PROBLEMS, along a line below: “Manual MA creation and no reference to past missions for cost estimation”; “No tools to flag high-risk items, spot missing documents, or surface discrepancies”; “Transaction creation is manual and no way to track spend against allocation in real time”; “Reviews are slow, manual, and leave no audit trail”.',
  // How Might We · card: Faster Creation
  'SqptrOaSY5frCoEnggjwNLjM0Nw.png':
    'Icon: a clock with a downward arrow.',
  // How Might We · card: Informed Purchasing
  'PtO9PS2QvbvVaYaZaKdVFkVhQ.png':
    'Icon: an open hand beneath a green dollar coin.',
  // How Might We · card: Confident Approvals
  'JlJjbNK85EaEIaTEACnD3q3iLI.png':
    'Icon: a document with a thumbs-up and a green check mark.',
  // How Might We · card: Real-Time Oversight
  'DL6KltpLPfXe5Mi6SAsgmjzTQOQ.png':
    'Icon: a warning triangle behind a magnifying glass.',
  // FIG. 4.1 · Information Architecture
  'mqbJCfCVxU805J6WaLwVnheGJw.webp':
    'Information architecture tree. The Homepage branches into five sections: Emergency Response (Mission Assignment and Cost Estimate lists, each with a create step followed by “Send for Approval”); Finance (Transactions, with “Create Transactions” and “Send for Approval”, and a Budget Dashboard); Approve (MA/CE Approvals and Transaction Approvals, each with a review step and Approve/Reject); Admin (User, Organization and Routing, each with a create step); and My Profile (My Profile and Log Out). Short notes under the steps describe the AI’s part, such as extracting key details from uploaded documents, referencing similar past missions and flagging discrepancies, with “AI informs, humans decide” under each Approve/Reject.',
  // FIG. 4.2 · Design Decisions · feature: AI suggests a cost estimate based on past missio
  'SIUjUhPvw7zLAcE7wzmMzD1oU.png':
    'Funding Lines form: with object class code 11000 chosen and the Total field in focus, a panel titled “Suggested from similar MAs” shows a recommended amount of $128,450 with high confidence, accept and dismiss buttons, and the three past mission assignments the suggestion is based on.',
  // FIG. 4.3 · Design Decisions · feature: Intelligent funding line suggestions from expens
  '2T4awq5EndAJdXrXkj5AeDF188.png':
    'Funding form with two open menus. Under Spend Plan Line, SPL-2026-001 carries a sparkle icon and guidance on when to use it; under Object Class Code, “11000 Salaries and Benefits” carries a sparkle icon and the note “Suggested based on the expense type described.”',
  // FIG. 4.4 · Design Decisions · feature: Define the approval chain once, enforce on every
  '4wlRCx5cRYfpCNgP5qkQTThdY.png':
    '“New Routing Rule” panel (“All new requests will follow this routing rule automatically.”): a vertical chain of approvers, each with a photo, name and role tag: a Fund Certifier, then a Budget Director, then two Budget Analysts grouped in one step, then a Requestor, joined by arrows with Collapse controls.',
  // FIG. 4.5 · Design Decisions · feature: Who approved what, when, and why, on the record 
  'UEkxg9Mt70G9qVSlt4tPFC8xwE.png':
    '“Approval History” table with columns Node, Status, By, Date and Comments. Three rows: “Fund Certifier Review”, In Review, pending; “MA Reviewer”, Approved, with a date and time; and “MA Entered” by a finance analyst, with the comment “Please review, and approve, for further processing”.',
  // FIG. 5.1a · Wireframing
  'DrPQJPmSFy5hqs5Q33Xlj71rEI.jpg':
    'Grey wireframe of a home page: a side menu (Emergency, Finance, Reports, Approve, Admin, Profile, Logout), a “Hello Sara,” greeting over an empty table of assigned tasks with MA and Finance tabs, panels for the authorized approver and quick actions (Create MA, Go to Finance, Create Transaction), and a notifications panel on the right.',
  // FIG. 5.1b · Wireframing
  'qJAYarE3qicN2WRsYUtomwBoo.jpg':
    'Grey wireframe of a “Mission Assignment” form with an “Upload document” button: Task Intake, Assignment Overview, Finance and Additional Notes sections, filled with sample values for Hurricane Milton; the empty Resource Request field is outlined in red and tagged “Missing”.',
  // FIG. 5.1c · Wireframing
  'EgnqSR6ad98l2JnHCdSrBFjxc.jpg':
    'Grey wireframe of a “Cost Estimate” list: a “+ New Cost Estimate” button, search and fiscal-year filters, and a table of estimate numbers, events and amounts.',
  // FIG. 5.2 · Design System
  'OQ6wkHxSOe6HSg8SF4QCNbNs2Mw.jpg':
    'Overview of the Treasora design system on one board: typography scales in Public Sans for desktop and mobile; the column, gutter and margin grid on a desktop and a mobile screen; colour ramps for primary blue, black, neutrals, background and the error, success, pending and neutral statuses; the Treasora logo and wordmark lockups on light and dark grounds; a system icon set; text-input states; table rows; and button variants in blue, red and green.',
  // FIG. 5.3a · Mobile
  'rwBl3lDOsRL93A0emJbOPZscQ.png':
    'Mobile home screen: a “Hello RanHit,” greeting, four quick actions (Create MA, Create Transactions, Create CE, Add an action) and a list of assigned tasks with MA, CE and Transaction tabs and status tags.',
  // FIG. 5.3b · Mobile
  'Ygiz9GXYTtHfJxyhFo3ZtxiiAg.png':
    'Mobile cost estimate marked Approved: funding-line totals by personnel, asset and goods and services, the cost estimate and obligation amounts, the CE total and remaining balance, and details for each funding line.',
  // FIG. 5.3c · Mobile
  'DwwVAuH70SeP3rU3yJ1Jvvrjs.png':
    'Mobile budget dashboard: cards for total cost estimate, total obligation, total spent and remaining budget, above horizontal bars of budget use per mission assignment and a floating AI button.',
  // FIG. 5.3d · Mobile
  '1ABh6bvuchQUxfEwZb89Hmczo.png':
    'Mobile “MA & CE Approval” list: search, filters for submitter, fiscal year, type and assignee, Pending, Approved and Rejected tabs, and a list of mission assignments and cost estimates with amounts and dates.',
  // FIG. 5.3e · Mobile
  'ntXxUvW8m9u6iB0N2FmGNDzdvM.png':
    'Mobile review of MA-2024-0001: a red banner reading “AI review found 2 High issues, 2 Medium issues and 1 Low issue.”, an AI Findings Summary listing each issue by severity, and Reject and Approve buttons.',
  // FIG. 5.3f · Mobile
  'u1hDJy6Xh9RZgsvceD9IqolVn8w.png':
    'Mobile approval history for MA-2024-0001: a timeline of three steps (Fund Certifier Review, pending; MA Reviewer, approved; MA Entered, with a comment asking for review and approval), each with the person, role and date.',
  // FIG. 6.1a · Key Insights · insight: Discoverability & Clarity
  'Ba0xoRNtdEJFDv0wUIc2Gb1aMo.jpg':
    'Close-up of the “Assignment Classification” form, with the Cost Estimate field and its “Create” link circled in red.',
  // FIG. 6.1b · Key Insights · insight: AI Visibility
  'kwWf2Uhq8nsR3xcQ2etNd26L5iI.png':
    'Close-up of a cost estimate’s review page, with the banner “AI review found 2 High issues and 3 Medium issues.” circled in red.',
  // FIG. 6.1c · Key Insights · insight: Trust & Control
  'IOkPZ3gG1rQACi2A5gntj0ODzVs.jpg':
    'Close-up of a Total field with a “Suggested from similar MAs” panel: a recommended amount of $128,450, a high confidence tag, and accept and dismiss buttons.',
  // FIG. 7.1a · Reflection
  'xT4pwHFrqO08imbqkUc9DgudRbs.jpg':
    'Five people stand together, smiling, in front of a green wall with the lit sign “Pho Thom, Vietnamese & Thai Cuisine”.',
  // FIG. 7.1b · Reflection
  'T0bMsC4OSOYoj6l06oeeSXZRpKA.jpeg':
    'Selfie of five smiling teammates in a large open study room, most of them holding up one finger.',
  // ─── CSBS (A-103) ───
  // FIG. 1.1 · Scoping
  '0NxDsXYd3Emz4a15bzaYYrGgqpc.jpg':
    'Screenshot of the NMLS Resource Center home page, with its dense navigation bar, three blue buttons and columns of NMLS News, Agency News and Popular Links, framed by two user quotes: “I don\'t like the Resource Center with so much information, its more convenient to call.” and “The pdf\'s and information on the Resource Center are helpful but not easily accessible.”',
  // Why This Project Matters · card: Reduce call center reliance and costs
  'Agm0WamahbMGSZMFlSQG9IOdzA.png':
    'Icon: a call-centre agent wearing a headset.',
  // Why This Project Matters · card: Understand small company user's experiences
  'SlhGZxMrkkE0zRF9rwiJZl6SZXs.png':
    'Icon: a group of people beside a magnifying glass.',
  // Why This Project Matters · card: Improve self-service support for NMLS
  'oiVRCFMvswJcgZghEOiH9ZLdrFg.png':
    'Icon: a glowing light bulb.',
  // FIG. 2.1 · Call Center Interviews
  '7m5JHk73DfwwI2jxSs9vAwsRCmk.jpg':
    'Collage of a spreadsheet interview guide: two sheets, one titled “Small Company - Filing MU2”, map each step of a filing process across the top against rows for actions, thinking, feeling and an emotion curve, with tabs for each process along the bottom; beside them, three screenshots of video calls with the same sheet shared on screen.',
  // FIG. 2.2 · User Interviews
  'SfCuyk9nIVoJIQgwThjEG8zyuVQ.jpg':
    'Screenshot of a remote interview: the NMLS Resource Center’s getting-started page for companies, a long list of numbered steps with links, is shared on screen during a video call, with the participants’ tiles on the right.',
  // FIG. 2.3a · ServiceNow Analytics
  'IjZYvkNkj0rsZjAE1UAFgcJGI.png':
    'ServiceNow case list with its filter conditions boxed in red (opened after June 13, 2025 and before July 14, 2025, category MU1, excluding the Amendments and ACN subcategories), a table of closed MU1 support cases with short descriptions, and the pager “1 to 20 of 466” boxed in red.',
  // FIG. 2.3b · ServiceNow Analytics
  'GPyEID7TRoGnv0r6CsAwJ9Sj4J4.jpg':
    'The same ServiceNow case list with the table of cases blurred, leaving the red-boxed filter conditions and the red-boxed result count, “1 to 20 of 466”, readable.',
  // FIG. 3.1 · Affinity Mapping and Synthesis
  'SrmoZmiKYD7LbLbnidvIN3hP9k.jpg':
    'Zoomed-out affinity map on a digital whiteboard, grouped into six areas: Account Creation, MU1, MU2, Account Management, Financial Statements and Form Payment. Green and blue header cards top clusters of sticky notes; a legend marks yellow notes as call-center agents and pink notes as end-users.',
  // FIG. 3.2 · Key Insights
  'BtJpZVkVUs5knJVbAwHJw1e0w.png':
    'Six numbered insights, each with a circled icon. It reads: “01 Users don’t find the quick pdf guides to be easily accessible or up-to-date. 02 The legal names in the account request documents does not match those listed on SOS/ IRS, delaying the licensing process. 03 Users’ have to perform multiple clicks to access the checkist compiler, which gets confusing. 04 Sole proprietors struggle with adding a date of formation as they don’t really have one. 05 Small businesses don’t understand the technical verbiage used on the Resource Center. 06 Small companies don’t understand how to calculate owner’s equity and prefer calling the call center.”',
  // FIG. 3.3a · User Journey Maps
  'vpdmEyGdI8ImCPy5Q0EiBG0q4.jpg':
    'Spreadsheet journey map titled “Small Company - Account Creation”: user activities grouped under Preparation, Form Filling and Awaiting Next Steps, with rows for actions, an emotion curve of smiling and frowning faces, pain points, colour-coded ServiceNow case counts, quotes, touchpoints and recommendations. A second sheet overlaps it, and tabs along the bottom name the other journeys: MU1 License, MU2 Filing, Financial Statement, Form Payment and License Management.',
  // FIG. 3.3b · User Journey Maps
  'cR6UphDJYrl5KBsgJPeOYdQRZ08.jpg':
    'A thin strip of six spreadsheet journey maps side by side, one for each tab: Account Creation, MU1 License, MU2 Filing, Financial Statement, Form Payment and License Management, each laid out with the same colour-coded rows.',
  // Design Goals · card: Reduce Visual Clutter
  'W6lJ51HpyHO1FrWLLwi9EbnGZw.png':
    'Icon: a person dropping papers into a bin.',
  // Design Goals · card: Simplify Navigation
  'U5HsVUvqaPgpeN7WzWV9AGRSs.png':
    'Icon: a browser window with a navigation arrow.',
  // Design Goals · card: Improve Search
  'vCn90r8rXrabnQKEeG4l9T9hTm8.png':
    'Icon: a gear with a magnifying glass.',
  // Design Goals · card: Clarify Language
  'F85f49n1CfJ5FqLZ64AdBJCHcrk.png':
    'Icon: two overlapping speech bubbles.',
  // Design Goals · card: Keep Content Current
  'TPNXAfdyQcQS143SAZLvKNPpds.png':
    'Icon: two circular arrows around a check mark.',
  // FIG. 5.1 · New NMLS Resource Center · feature: Task-Based Information Architecture
  'BXlkhlt8LeADLUGEYUTiZB2xs54.jpg':
    'Left half of a laptop showing the redesigned CSBS Knowledge Center page for NMLS in a browser. A callout labelled “Task-based Information Architecture” points to its side navigation: About NMLS, NMLS State Resource Center, NMLS Federal Resource Center, Electronic Surety Bonds and NMLS Approved Course Provider Resources.',
  // FIG. 5.2 · New NMLS Resource Center · feature: Global Persistent Search
  'cytCJG0dDu98YnBOtMXYOqHYTo.jpg':
    'Right half of the same laptop. A callout labelled “Global Persistent Search” points to the “Search this site” box, and a dashed line leads up to an enlarged “NMLS Licensing for Companies” page with a wide search bar above a list of licensing topics.',
  // FIG. 5.3 · New NMLS Resource Center · feature: Dynamic Content Management
  'a9Ks6XtxlvRgtDf1JChl7LQakk.png':
    'Two views of the page “Licensing Process Overview for Companies”, labelled “Collapsed XML file” and “Expanded XML file”: first its seven numbered steps as a collapsed list, then the same steps opened to show the text under each.',
  // FIG. 5.4 · New NMLS Resource Center · feature: Integrated Glossary Access
  'GSYkrkshJsH7cULPBcUm93qbcM.png':
    'The “Licensing Process Overview for Companies” page with a callout labelled “Integrated Glossary Access” pointing from an A–Z book icon to a small book icon in the page’s top navigation.',
  // FIG. 6.1a · Reflection
  'acRAcPK51NoLJ8LHSqgrpjj2Wg.jpeg':
    'Group photo of about a dozen people in business-casual clothes standing together in a bright office lobby.',
  // FIG. 6.1b · Reflection
  '0DgrhSrnYqbmgZKu3PnA8Rrtvw.jpeg':
    'An office desk with two large monitors, an open laptop, a notebook, a mouse and hand sanitiser, seen from the chair.',
  // FIG. 6.1c · Reflection
  'pIDtD36Hpq3doMGXAW2oSsLaNgE.jpeg':
    'Selfie of three smiling people seated in the rows of a theatre, with other audience members beside them.',
  // FIG. 6.1d · Reflection
  'NfKXubAUMyPGvUNfxwNhQaPIR7c.png':
    'Group photo of eleven people in office attire standing in two rows in an office room with a colourful painting on the wall.',
  // ─── U-Up (A-104) ───
  // FIG. 1.1 · Design Solution · feature: Matching users through AI interactions
  'fvgOb7paqb8aI3RLh9ZvVpZoU8.gif':
    'Phone recording of the U-Up app on a dark purple screen. It asks “Hey there, How are you feeling right now?”; the user types “I can\'t sleep. I don\'t know why, but my thoughts feel tangled in my head..” and taps Continue. The screen shows “Extracting Keyword...” as phrases in the answer light up, then “Oh, I got you! I can connect you with someone who has shared similar experiences!” with the keyword chips Anxious and Nervous.',
  // FIG. 1.2 · Design Solution · feature: Visualising Regional Connections
  'sXzdMl4SEFeL4sF51iLLjSHVoDo.gif':
    'Phone recording of the U-Up app: under “Your keywords:” (Anxious, Nervous, Job), a starburst of glowing points links the user to others, with the line “Theres 50 people in the area feeling the same as you right now.” One point is tapped and highlighted; the screen then reads “B-153 has experienced this before. Do you want to talk with them?” above a “Hey, u up?” button.',
  // FIG. 1.3 · Design Solution · feature: Anonymous Time-Restricted Chat
  'LDyuw9DTp9W6eRcAL624pBSTJHU.gif':
    'Phone recording of the U-Up app: the user taps “Hey, u up?” under “B-153 has experienced this before. Do you want to talk with them?”; the screen shows “Connecting with B-153...” with a Cancel button, then opens a chat headed “Talk with B-153”, where the messages “Hi!” and “Hi, I’m so glad to talk with you!” appear and a typing indicator follows.',
  // FIG. 2.1 · Secondary Research
  'YihqD9mWB3fEEvHT9bGhpIJWcE.png':
    'The word “Vulnerable?” in large type, surrounded by five coloured question pills: “Who do you feel comfortable talking to when you are:”, “When are you the most:”, “How do you behave when you are:”, “How does your daily experiences make you:” and “How does your community react when you are:”.',
  // FIG. 2.2 · Survey
  'MSXXSFArimIHXfSG04aBaXtykFs.png':
    'Phone showing two survey questions with answer options: “How often do you experience feelings of anxiety, nervousness, or loneliness?” (Daily, Several times a week, Once a week, Rarely) and “During which time of day do you most often experience these emotions?” (Morning, Afternoon, Evening, Late-night).',
  // Competitive Analysis
  'yN6VtOwfgmxIVENvwQ1f7rb1pjM.png':
    '7 Cups logo: a blue cup above the words “7 Cups”.',
  // Competitive Analysis
  'UV3USwlcgfzLNdnhdzpm5TqHvY.png':
    'Reddit logo: the white alien mascot on an orange circle.',
  // Competitive Analysis
  'MX3JSFGhhYN0HuZIDQpvCxO9SE.png':
    'SupportGroups.com logo: the letters “SG” in green.',
  // Competitive Analysis
  'FYlsVfQKHJebVVMGXXTrLPHQIwA.png':
    'The Mighty logo: the words “The Mighty” in white on red.',
  // FIG. 2.4 · Competitive Analysis
  'gxh5qD2sWWaKpuY3yqtN0bPLGnk.jpg':
    'Comparison table of four platforms, Reddit, 7 cups, The Mighty and SupportGroups.com, with rows for type, platform, stakeholders catered, overview, strengths and weaknesses, and key phrases in bold. Their types read: “Discussion board / community forum”, “Online therapy and emotional support platform”, “Community platform” and “Online support groups and forums”.',
  // FIG. 3.1 · Key Insights
  'KKvm6krXIbAvSwPSwuIhsEy984.png':
    'Four numbered insights, each with a circled icon, along a plum line. It reads: “01 Distress peaks in evening and late-night hours when traditional support is unavailable. 02 Empathy requires shared experience. Existing platforms connect users with listeners who haven\'t faced the same challenges. 03 Isolation amplifies vulnerability. In those moments, users don\'t know others nearby share their struggles. 04 Real-time connection is missing from current solutions that rely on asynchronus forums.”',
  // Product Goals · card: Privacy-first
  'A31flALfbLhpLOnxkzSZKXz0nI.png':
    'Icon: a shield with a padlock and a person silhouette.',
  // Product Goals · card: Consent-driven
  'yAi9JKE3Kkwcii4bwToozGaif7g.png':
    'Icon: stacked documents with a check mark.',
  // Product Goals · card: Time-bounded for safety
  'hOh9LthZaJQtoDxfOFGNMN1Eac.png':
    'Icon: an hourglass.',
  // FIG. 4.1 · Ideating and Concepting
  'q6ExA1YGniMFZ8vEpgzUa8GhHf4.jpg':
    'Digital whiteboard with two areas. “Ideation” holds four groups of sticky notes. “Concepting” sorts notes under Define Human Connection, Target Audience (who), problem statement (why), Research & best practices, and experience settings and experience goal (what), with a 7 Cups link card; a “Problem Statement” flow of notes below. Arrows lead to the concept “A digital tool(for mobile/iPad) that helps build connections by matching people with similar vulnerabilities” and a short written brief.',
  // FIG. 5.1 · Wireframes
  'mohqTNO60PBewaVBPAyBDIWh4.jpg':
    'Fourteen low-fidelity phone wireframes in two rows: splash, intro animation and a meditating illustration; the question “How are you feeling right now?” with a typed answer, keyword extraction and highlighted keywords; a follow-up question about the reason; a map of connected people around “ME”; an invitation to talk; and a chat screen with a “Leave” button.',
  // FIG. 5.2 · User Flow
  'cey9L4IrjUQGf2l6HVXyuOEHDC8.jpg':
    'User flow of twelve U-Up screens in three rows joined by arrows, starting from a “Late-night trigger”. Each screen is labelled underneath: Splash Screen; Meditative animation to encourage user to open up; Instant Access, No onboarding; Prompt to share feelings; Extracting keywords for matching; Extracted keywords; Prompt to add more context for better matching; Extracting keywords for matching; Visual graph showing people sharing similar feelings in vicinity; Consented match with overcomer; and Time-boxed chat.',
  // FIG. 5.3 · Main Features
  'Jj6mtgIdKZx8m8Fd6sdljCij8.jpg':
    'Three phones labelled as steps. Step 1, “Instant Access, No onboarding process”: the prompt “Hey there, How are you feeling right now?”. Step 2, “Discover you are not Alone”: the keyword graph and the offer to talk with B-153. Step 3, “Establish connection with a community of overcomers”: the chat with B-153.',
  // FIG. 5.4a · Presentation
  'DGP887lSg3BslXC1WqoKLaW5uuQ.jpeg':
    'A team member demonstrates the prototype on a laptop and phone to a listener at a round table in a busy hackathon hall, with a countdown timer on the screen behind them.',
  // FIG. 5.4b · Presentation
  'UmkbMjWKivVXxVMFaytrWezqXkQ.jpeg':
    'From behind the lectern, two team members face a large lecture hall with the U-Up title slide open on a laptop.',
  // FIG. 5.4c · Presentation
  'n96Sk7QIJq1r0JSEj6iQOepFc.jpeg':
    'A large pixel-art screen announcing “First Place”, “Projectors” and “Team 3: U-Up”.',
  // FIG. 5.4d · Presentation
  'qdrBaCdP4ouf5D5dpXXBsJvU.jpeg':
    'Selfie of four smiling team members in a hall, two of them holding boxed projectors.',
  // ─── Orbit (A-105) ───
  // Overview (under the case header)
  'UHWtZDl7VBaFhCnX2PHWVnA.webp':
    'University of Maryland logo: a globe patterned with the Maryland flag beside the words “University of Maryland”.',
  // Problem · card: Teaching
  '8Oj19nTyi3TGaDlAbrh8XbRKFgQ.png':
    'Illustration of a teacher holding up a card with the numbers 1 and 2 to a group of seated children, who raise their hands.',
  // Problem · card: Service
  '1XIqZxBq1JxP1ZsNmdwPLEVykA.png':
    'Illustration of a speaker at a lectern addressing a seated group, with speech bubbles above them.',
  // Problem · card: Research
  'F4gh7ziTdTWaHThSc6cAFiFFr60.png':
    'Illustration of a woman with a laptop sitting on a stack of books, surrounded by charts, reports, gears and a magnifying glass.',
  // FIG. 1.2 · Process
  'lmyeINAE6IwVaP6vGOdUrlN18s.jpg':
    'Radar chart with five axes, Prototyping, Testing, Development, Research and Ideation, and a red shape that reaches furthest toward Research and Ideation, part-way toward Prototyping and barely toward Testing and Development.',
  // FIG. 1.3 · Design Solution · feature: Workload Balance Dashboard
  'EvkBPiNQpqaxgYQO9KQBL5Oc0.jpg':
    'Screenshot of the Orbit dashboard in a browser: Day to Year period tabs and a date range; a summary of 67 hours of teaching, 32 hours of service and 20 hours of research; a warning that service hours are above the target for the period; and Workload Balance bars comparing each area’s current share with its target, with an “Edit targets” link.',
  // FIG. 1.4 · Design Solution · feature: All Activities
  '4M9BD5r6146YwptlmP9ZPNgnjo.jpg':
    'Screenshot of Orbit’s “All Activities” page: a banner reading “1 activity selected. Ready to add to your year-end report” with an “Add Selected to Report” button; filters and a list of logged activities, each tagged Teaching or Service with hours and date, one of them ticked; and an AI Assistant panel suggesting activities to log from connected sources, such as a faculty senate meeting found in Google Calendar at 95% confidence.',
  // FIG. 1.5 · Design Solution · feature: Editable AI-generated Annual Report
  'EYLzkHZoL8LoHHGfMVXXnpsc.jpg':
    'Screenshot of Orbit’s “Annual Report” page: an editable, AI-generated faculty activity report with a formatting toolbar and an “AI Generated” tag, beside an Evidence Library listing 45 activities (67 hours of teaching, 32 of service, 20 of research) with a delete button on each, and an “Export Report” button.',
  // FIG. 2.1 · Interviews
  'sblhX1WvmByXfdiT4knIqM7fRU.jpg':
    'Pictogram chart of interview participants by role: Service-focused, two people; Research-focused, one; Teaching-focused, three; Mixed Role, two.',
  // FIG. 2.2 · Activity 2: Designing an Ideal System
  'aQryv3F4EswcDaR5tAFCeuNGU.png':
    'Collage from a participatory design activity: weekly schedules filled in with sticky notes and emoji (a “Weekly Workflow Mapping” board among them), two browser-frame sketches titled “Tracking your Academic Year 2025-2026” covered in notes, and two participant quotes: “I want the platform to suggest conferences that are relevant to my work, so that I grow professionally.” (Interview Participant C01) and “I would like to see my breakdown of tasks (teaching, service, research) at any particular time of the week or month.” (Interview Participant D01).',
  // FIG. 3.1a · Understanding the Data
  'iBMHn5qPmspfDuv8fP6vt7VFVHQ.png':
    'Two cards with line icons: “Affinity Notes. Created comprehensive notes via Interpretation Sessions” and “Affinity Diagram. Categorised Affinity Notes to uncover main themes”.',
  // FIG. 3.1b · Understanding the Data
  'XedUWebLXaneTDTZAFNkGdIWp84.jpg':
    'Zoomed-out affinity diagram of yellow sticky notes under blue and pink header notes, grouped into six themes: Digital Tool Usage, Performance review, Personal and Professional growth, User Needs about Productivity, Workload balance, and Tool Usage & Frustrations.',
  // FIG. 3.2 · Key Findings
  'XX56l1J495EmmGkWnaCMBqcH688.png':
    'Five numbered findings, each with a circled icon. It reads: “01 Faculty uses a variety of digital tools for professional tasks. 02 Users find documentation for performance review time-consuming and repetitive. 03 Users’ personal life and habits shape how they approach work. 04 Faculty values flexibility but relies on weekly recurring meetings as a consistent anchor. 05 Users are worried about complex digital tools slowing them down.”',
  // FIG. 3.3 · User Journey Map
  'iIUYidJuBXIurReX7guC3J0j5Ag.png':
    'Journey map titled “Dr. Maria’s Journey”, with a portrait and her profile (age 35, Info College, UMD, 2 years of experience). Four stages, Planning Goals, Working on Goals, Documenting Progress and Performance Review, each carry actions, touchpoints (Google Calendar, physical diaries, Classroom, Zoom and Gmail, Google Docs, Faculty Success), an emotion line that dips from energised to overwhelmed and ends unclear about her achievements, and numbered opportunities in a box under each stage.',
  // FIG. 3.4a · Walk Walk
  'GGfB63Xb1Z3iy0joEYLuy88Vidk.jpeg':
    'Visitors reading research posters and a large affinity diagram of sticky notes pinned to whiteboards; one adds a note to a poster.',
  // FIG. 3.4b · Walk Walk
  'EyGahOxuLSHOmD4RyV8aJ2KZpd8.jpeg':
    'A visitor in a suit reads a research poster pinned to a whiteboard, beside a handwritten sign stating the research question.',
  // FIG. 3.4c · Walk Walk
  'pJuumr2TDq9UOLw5zUyt7TWnUt0.jpeg':
    'Five team members smile in front of the whiteboards holding their research posters and affinity diagram.',
  // FIG. 3.4d · Walk Walk
  'BAigcUUzXxmsWomL9aYKv5s0U.jpeg':
    'A visitor studies the large affinity diagram of sticky notes on a whiteboard, pen raised to her chin.',
  // Design Goals · card: Decision Clarity
  'J6I2NiR9ye7w6gvEWTAMG2hyYE.png':
    'Icon: a person pointing to a check mark above a cross.',
  // Design Goals · card: Balanced Commitments
  'Lfx4fx1nVaPrC9PoybLb4czBTHk.png':
    'Icon: a balance scale.',
  // Design Goals · card: Streamlined Updates
  '5yrgUfYpOPfqAvnKyb5YKyM5JA.png':
    'Icon: a résumé page with a portrait photo.',
  // Design Goals · card: Honouring Personal Life
  '0YXilKZrJeZZKGqmbNs6IBwZ5o.png':
    'Icon: a person holding a heart to their chest.',
  // Design Goals · card: Peer Learning and Comparison
  '53tjgJAqz0DezHRBvFLbdol8Cs.png':
    'Icon: three people linked in a circle.',
  // Design Goals · card: Career Growth
  'ZnTpkzWDIzl1k12ZZLvo1l6cQRE.png':
    'Icon: a person with a briefcase climbing a rising bar chart.',
  // FIG. 4.1a · Design Alternatives
  'L2rNvBTpjcL8sFrG805usBfPg.png':
    'Pencil sketch labelled “IDEA 1”, a dashboard that gathers tasks from calendar, email and ELMS in one place, where the professor marks items important or discards them; cards such as “Mentored 3 students” and “Accepted Paper! CHI 2025” feed a promotion-planning document and an “End of year WRAPPED!” summary “(like spotify)”.',
  // FIG. 4.1b · Design Alternatives
  'AsmhYZ4yHfi7hGF0yfEI44gXUY.png':
    'Pencil sketch labelled “IDEA 2”, a diary for logging contributions easily on the go: daily prompts such as “Did you have any student interactions today?” and “Any community work today?” with Yes and No buttons, a form to add the contribution, and a note that small daily contributions add up to an end-of-year list.',
  // FIG. 4.1c · Design Alternatives
  'nEWiq0mcXzcoXwQIWAaNrTXvA4.png':
    'Pencil sketch labelled “IDEA 4”, generative-AI support for filling in Faculty Success: while a service task or time is typed, AI suggestion cards list tasks from the last eight months and hours drawn from the calendar, with a note about AI pulling data from the platforms faculty use.',
  // FIG. 4.1d · Design Alternatives
  'tmypcLaZrlWiXDWV5IsQHRdIIs0.png':
    'Pencil sketch labelled “IDEA 5”, a personality-specific visual dashboard: a short quiz (visuals, numbers or a mix; personality type; whether you are easily overwhelmed) feeds a sketched dashboard, with the note “combine personality & preference to create visual dashboard of our product”.',
  // FIG. 4.2a · Design Alternatives
  'Eh2EXOFWBTgTdHjWDMkZFfsPA.jpg':
    'Grey wireframe of Orbit’s “Set your target balance” dialog: percentage fields for teaching (40%), research (40%) and service (20%) with recommended ranges, a 100% total, and Save targets, Use department defaults and Cancel buttons.',
  // FIG. 4.2b · Design Alternatives
  'LVlCaT4vGgmI8bLkF2d377PWmw.jpg':
    'Grey wireframe of Orbit’s Balance Board for Fall 2025: three vertical bars comparing the current share of teaching (38%), research (42%) and service (32%) with their targets, the note “Service is above target — consider declining new service requests.” and an “Adjust targets” button.',
  // FIG. 4.3a · Design Alternatives
  '34zvVOLJJnfshfSOljrVF0VDwg.jpg':
    'Grey phone wireframe of the Orbit Diary home screen: a New Note button, quick-add tags (Email, Meeting, Student Support, Committee, Other), recent notes tagged Service, Teaching and Research, and a count of 12 notes this week.',
  // FIG. 4.3b · Design Alternatives
  'Sdi9fpuOtTfiQvOQArynv2SXDg.jpg':
    'Grey phone wireframe of a “New note” form: a note field, date and time, Teaching, Research and Service tags, a duration menu, Voice and Photo attachments, and Save and “Save & sort later” buttons.',
  // FIG. 4.3c · Design Alternatives
  'YzCRzNFsLxivDz0SfvWzny8I8Hc.jpg':
    'Grey phone wireframe of a “Daily Review” for one day: time bars for teaching, research and service, a filterable list of logged items with checkboxes and tags, two of them ticked, and an “Add to Activity Log” button.',
  // FIG. 4.4a · Design Alternatives
  'zFeHeMhdpCY5I8R8Gg7WuSzEhkQ.jpg':
    'Grey wireframe of an AI Assistant panel on its Sources tab: connected sources (Email, last scanned 2h ago; Calendar; Drive; Faculty Success) and ORCID not yet connected, a “Scan now” button, and the note “Data stays private until you insert into a report.”',
  // FIG. 4.4b · Design Alternatives
  'IDfakCRKkHGHy1E4iUMx8hV6s.jpg':
    'Grey wireframe of the AI Assistant’s Drafts tab: draft evidence statements filtered by Teaching, Research and Service, such as “CHI 2025 paper accepted” and “INFO 340 course development”, each listing its sources with Discard, Edit and Insert actions, above an “Insert all selected” button.',
  // FIG. 4.4c · Design Alternatives
  'D5vdXTIvmJ5wU1ao09JFBPIxxEA.jpg':
    'Grey wireframe of the AI Assistant’s Suggestions tab: a “What’s missing” checklist (teaching evaluations, a committee to log, a grant award letter to upload) with an action for each, a structure preview of the Annual Report 2025 counting filled sections per area, and a “Generate outline” button.',
  // FIG. 4.5a · Design Alternatives
  'dmYGKgeYLIofZCmef9ubUCKZ8eY.png':
    'Wireframe of an Orbit home screen in Balanced mode: a “This Term Balance” card comparing teaching, research and service with their targets; a private Personal Life card with weekly hours for caregiving and self-care; a Today list with a “Log activity” button; and homepage style options.',
  // FIG. 4.5b · Design Alternatives
  '0KlustOeYmkx23Qcnqh8xoS4GY.png':
    'The same Orbit home screen with a Personalize panel open: mode choices (Balanced, Teaching-focused, Research-focused), checkboxes for homepage content and personal-life options, and Reset and Save buttons.',
  // FIG. 4.6a · Design Alternatives
  'G6n17x2LiEnY7faXnSbt4FFxa4.png':
    'Wireframe of Orbit’s Boards page: cohort filters, four discussion boards (Assistant Professors (TT), Professional Track, Associate Professors, All Faculty) with member counts, topic tags and “Open board” buttons, and a “Saved to Orbit” sidebar.',
  // FIG. 4.6b · Design Alternatives
  'SyBtpwdn4dwbeZx6CjoP7nobdA.png':
    'Wireframe of the “Assistant Professors (TT)” board: topic filters, a “New post” button, and colleagues’ posts about a CHI deadline, an NSF solicitation and teaching data structures, each with a “Save to Orbit” action.',
  // Design Decisions · card: Workload Dashboard
  'HtQY3Cbal8Ws9ZZfEDxvVVfoPU.png':
    'Icon: a dashboard with a gauge, a bar chart, a pie chart and lines of text.',
  // Design Decisions · card: Gen-AI for Orbit
  '5IKDzeOtXwhvsoIW2xjmC8afyOU.png':
    'Icon: a chip labelled “AI” with circuit lines.',
  // Design Decisions · card: Diary Log
  'pwX0muATU08qMAJb30CFsOMnfs0.png':
    'Icon: a closed notebook with a bookmark ribbon.',
  // Design Decisions · card: Discussion Board
  'kFBAx3Dn8zVH0jsypgM1r2dfFc.png':
    'Icon: two overlapping speech bubbles in a rounded square.',
  // FIG. 4.7 · Information Architecture
  'rtKR2XPIOtLs0SnLfWllCyBO0.jpg':
    'Information architecture of the “Orbit Web Dashboard”: five sections, Workload Dashboard, All Activities, Reports, Community and Settings, each with its pages listed beneath and a short note on each (for example workload bar charts and targets, activity details and an AI Assistant, an evidence library and an exportable report draft, discussion boards and saved posts, and settings for targets, connected sources and notifications).',
  // FIG. 5.2 · Prototype · feature: Target Setting
  '4cDvhWA7JE4bextXrBLRBQdpEA.jpg':
    'Screenshot of Orbit’s “Edit Targets” page: sliders and percentage fields for teaching (40%), service (15%) and research (45%) with the confirmation “Total: 100% ✓ Perfect! Your targets add up to 100%”; a Recommendations panel proposing 50%, 20% and 30% for a teaching-focused role with an “Apply Recommendation” button; a list of tips; and Save Targets and Cancel buttons.',
  // FIG. 5.3 · Prototype · feature: All Activities
  'ZVMS4gWWFcgYSxAXkq84aodtr4.jpg':
    'Screenshot of Orbit’s “All Activities” page: search, a date filter and category tabs above a list of logged activities (a lecture, a curriculum committee meeting, office hours), each with its tag, hours, date and an “Add to Report” checkbox, beside an AI Assistant panel suggesting activities to log from Google Calendar and email, with confidence scores and “Add Activity” buttons.',
  // ─── Educademy (A-106) ───
  // FIG. 1.1 · Design Outcome · feature: Personalised Dashboards
  'so2bh2Z1W0CGtqzMd31ce39P24g.gif':
    'Phone recording cycling through Educademy’s three home screens: a parent’s (“Good Morning, Sophie!”, with upcoming assignments and their status), a student’s (“Good Morning, John!”, with courses, instructors and resources) and an instructor’s (“Good Morning, Amelia!”, with a to-do list of grading and her classes).',
  // FIG. 1.2 · Design Outcome · feature: Real-Time Assignment Tracking
  'n8B6UjNXYmQuUj8qsFbQGT75Vdo.gif':
    'Phone recording in Educademy’s parent view: an assignment, “Maths - Part B”, shows the child’s status as opened, submitted and not checked. A notification dot appears on the bell; the notifications list opens with “Maths Part B assignment is checked.” at the top, and tapping it returns to the assignment, whose last status now reads Checked.',
  // FIG. 2.1 · Secondary Research
  'RlPGi8dBexCCwbkfYyJqLig.jpg':
    'Mind map with “E-learning” at the centre and four branches: “Who are the stakeholders?” (students, teachers, parents, institutions); “What are the benefits & challenges?” (scalability, engagement issues, the digital divide, self-motivation); “Why is E-learning needed?” (accessibility, cost-effectiveness, personalized learning, flexibility); and “How is it carried out?” (LMS platforms, virtual classrooms, pre-recorded lectures, gamification), each with further details.',
  // FIG. 2.2 · Competitive Analysis
  'EnflUwK2tHqWS9f8tbvihmxNiCI.png':
    'Screens from four existing learning apps, each labelled: Khan Academy (an Explore screen of subjects and courses), Seesaw (an activity library for 4th grade), KidCoach (popular topics and editor’s picks for families) and Homeschool Panda (a side menu with dashboard, lesson planner, calendar and more).',
  // FIG. 2.3 · Competitive Analysis
  'f4jVXJVhm4E8To2iuCZB37BCA.jpg':
    'Comparison table of four apps, Khan Academy, SeeSaw, KidCoach App and Homeschool Panda, with rows for type, platform, stakeholders catered, overview, strengths and weaknesses, and key phrases in bold. Their types read: “Free Online Educational App”, “Learning Management App”, “Parent-Assisting App” and “Homeschool Organisational Tool”.',
  // FIG. 2.4a · Interviews
  'nncmf0aDfyRTtrUu16t50q7ETQ.jpeg':
    'An interviewer talks with two students in school uniforms across a glass-topped desk in a school office.',
  // FIG. 2.4b · Interviews
  '7GOICdzY8dHcrCEUh9Jumltudy8.jpeg':
    'Wider view of the same school office: the interviewer, at the desk with a laptop, speaks with two students in uniform.',
  // FIG. 2.4c · Interviews
  'c7QUHWI535d2YRhYeWXvT1TpMkE.jpeg':
    'The interviewer takes notes while two older students, one in a school blazer and one in a grey hoodie, answer questions across the desk.',
  // FIG. 2.4d · Interviews
  'SsgOhVsFHWXh4MzwkXVXNQXbfd4.jpeg':
    'Close view of the interviewer writing in a notebook as a student in a grey school hoodie with a prefect badge speaks.',
  // FIG. 2.4e · Interviews
  'ls0doisVOwAu8WetYy3tBIQrjw.jpeg':
    'The interviewer gestures as she explains something to a young student in uniform, with a notebook and laptop on the desk.',
  // FIG. 2.4f · Interviews
  'utuWOArvvGix4UPlu2q0C9H0f8.jpeg':
    'The interviewer takes notes at a laptop while a teacher speaks from across the desk in the school office.',
  // Interviews · card: Students were largely satisfied with Microsoft T
  'JG0gllebG6BWvIR6mQCbi6wvO8.png':
    'Microsoft Teams logo: a purple tile with a white “T” in front of two person silhouettes.',
  // Interviews · card: Parents were updated through a parent's alarm ap
  'zpmUnLauSeryOGhF1X3e0vDz9TE.png':
    'Canvas logo: a ring of blue shapes and dots.',
  // FIG. 2.5 · Revisiting Competitor Analysis
  'oOEAJ5v9rudf7Fy0AmwE5gQ4vWo.jpg':
    'Comparison table of Microsoft Teams and the Canvas Parent App, with rows for type, platform, stakeholders catered, overview, strengths and weaknesses, and key phrases in bold. Their types read: “Collaboration & Learning Management App” and “Parent-Assistive Learning Management App”.',
  // FIG. 3.1a · Personas · tab: Parent
  'SR92rsFv2mwGtYauUhM7q4zcSRo.png':
    'Persona card with a 3D avatar of a woman with long dark hair. It reads: “Amanda. Age 38, Married, Bachelors, Family 4, Architect. “It’s just all too overwhelming. Am I even qualified to teach my kids at home?” Goals: Wants their child to receive the finest quality of education. Wants to track child’s weekly progress. Frustrations: Does not want to devote so much time figuring out the technology behind online education. Worries if she can educate her child. Amanda is an architect and a mother of two children. She recently lost her job during the pandemic and has to focus on household chores. She wants an easy and intuitive online learning app that provides her with weekly child progress reports.”',
  // FIG. 3.1b · Personas · tab: Teacher
  'bEYYaQ2rP0W4LbMDdGab9xD20.png':
    'Persona card with a 3D avatar of a woman in glasses and a blazer. It reads: “Ellie. Age 35, Unmarried, PHD, Family 4, Maths Teacher. “I am new to this technology. I wish there were guides on how to use this platform” Goals: Wants to regularly give feedback for students progress. Wants to make easy to digest content for children. Frustrations: Is not tech-savvy. Faces difficulty in using the digital tool. Ellie is a maths teacher for elementary students and is still new to E-learning. She wants the best for her students but is not so comfortable with technology. She wants to regularly give feedback to her students.”',
  // FIG. 3.1c · Personas · tab: Student
  'tSqWABfYzM3XJmOL7gzxwOEw98.png':
    'Persona card with a 3D avatar of a grinning boy in large glasses. It reads: “John. Age 10, Unmarried, Primary, Family 4, Student. “I wish online learning allowed me to clear my doubts in real time, just like in a traditional classroom” Goals: Wants a balance of fun and studies. Wants to socialise and meet his friends. Frustrations: Feels eye sore after too much screen time. Feels lonely at home. John is a 10 year old student who misses going to school with the spread of COVID. He misses his friends and feels lonely at home. He wants to do well in his studies.”',
  // FIG. 4.1 · Ideate
  'j4fkcHZSxtz9sKarh0MRGWViPhA.png':
    'The question “How might we simplify e-learning for students, teachers, and parents in India?” set over a large lavender question mark.',
  // FIG. 4.2 · User Stories
  'jR7JYhIIKpIWHYVoUe395Pn004M.png':
    'User stories on sticky notes in three colour-coded rows: five for Parent (pink), five for Teacher (blue) and seven for Student (purple), each written as “As a…, I want… so that…”, for example “As a forgetful child, I want a recording feature to record my classes so that I can rewatch it.”',
  // FIG. 4.3 · MoSCoW Method
  'PYYsZbUL5gcoIfOPWuyuPgIgMMI.png':
    'MoSCoW matrix of the same user-story notes on axes of importance and urgency: seven under Must Have, five under Should Have, five under Could Have, and none under Won’t Have.',
  // FIG. 4.4 · Key Features
  'MUc9Twv4Yw1Rk3YoDkkbfgeMzzw.jpg':
    'Table of key features by user. Parents: a call scheduling feature to connect with instructors for regular updates, and daily and immediate updates on their child’s performance through live notifications. Teachers: technical guidance and support to navigate the app easily, class scheduling and management for online sessions, and real-time updates on student participation. Students: a doubt clearing feature for real-time and asynchronous doubt resolution, a fun and engaging interface to keep them motivated, and attending online classes directly through the platform.',
  // FIG. 5.1 · Sketching
  'hmlzg7L1Vy0H0jcvjxR2FalwHQ.png':
    'Two open dot-grid notebooks with pen sketches of phone screens, ribbon bookmarks draped across the pages. Callouts point to the areas labelled “Resources for parents”, “Notifications” and “Assignments”, and one page is headed “Parent home page”.',
  // FIG. 5.2 · Low-Fi Prototypes
  'xq6jjMhcBPxaPBxsWQvIzUwjxTg.png':
    'Eight low-fidelity phone wireframes in grey, each labelled underneath: 00 Splash Screen (“Educademy, Homeschooling made easy”), 01 Onboarding Screen, 02 Login Screen, 03 Parent Homescreen, 04 Assignments, 05 Schedule a Call, 06 Date and Time, and 07 Call Confirmation.',
  // FIG. 5.3a · Final Mockups
  'B5NFx69klzps0NHhxXZVA4uQXw.png':
    'Four high-fidelity phone screens, each labelled: 00 Loading Screen (purple, with the Educademy logo), 01 Onboarding Screen (“Get started!”), 02 Login Screen and 03 Signup Screen, where the user picks Parent, Teacher or Student.',
  // FIG. 5.3b · Final Mockups
  'fxIJ8TfkoshCTou03ZrJkLpGKk.png':
    'Four high-fidelity phone screens, each labelled: 04 Student Dashboard, 05 Instructor Dashboard, 06 Parent Dashboard and 07 Child Status - Parent, which shows an assignment opened, submitted and not yet checked.',
  // FIG. 5.3c · Final Mockups
  'UIK9IKjA2htGfz3i3mnqSJa0s8.png':
    'Four high-fidelity phone screens, each labelled: 08 Schedule a Call (a grid of teacher photos), 09 Select Date + Time, 10 Date Picker and 11 Call Confirmation, with the teacher’s profile, the booking details and a “Book another appointment” button.',
  // ─── About (B-100) ───
  // Historical Fiction · FIG. 1.1
  'cHvLFjmkIVcEHSvBWg8yAPWPtmU.jpg':
    'Cover of “The Book Thief” by Markus Zusak, the film tie-in edition: a girl clutching a book to her chest on a street with a fire burning behind her.',
  // Historical Fiction · FIG. 1.2
  'ELriPrXDt52v8CseD2JrDCpM.jpg':
    'Cover of “Pachinko” by Min Jin Lee: an illustrated woman in a white hanbok whose skirt becomes a landscape of mountains and water, with a National Book Award Finalist seal.',
  // Historical Fiction · FIG. 1.3
  'uWV8s87snrPxhjrBBSr2Y3boI.jpeg':
    'Cover of “All the Light We Cannot See”, the Netflix series edition: a young woman in a green dress sits against a wall, hands pressed to her headphones.',
  // Meditation
  'B4i82MXuCijqdjx0mPV84ZzTM8M.jpg':
    'Illustration of a contented face, closed eyes and a wide smile drawn in black lines, on a large orange circle against a yellow background.',
  // Sketching · FIG. 4.1
  'JDDLKVlZddaiHcGB3An7NlOd0Q.png':
    'Coloured-pencil drawing of a Kathakali dancer’s face: green face paint, black-rimmed eyes, red lips and a tall red, green and gold headdress.',
  // Sketching · FIG. 4.2
  'RNUtuBnvNm3fdod5f4EpHfqBE.png':
    'Coloured-pencil drawing of a single pink rose on a green stem, signed “Saumya”.',
  // Sketching · FIG. 4.3
  'uEhkOCukMrK1gyMJTTyB3rNCTYA.png':
    'Graphite portrait of a young woman with loose, swept-back hair, looking at the viewer; signed and dated 2017.',
  // Sketching · FIG. 4.4
  'DkdSjNwt9pSYJCwdEdmmN1Gic8.png':
    'Coloured-pencil drawing of a brown horse’s head and neck with a dark mane, signed “Saumya” and dated 19/12/2015.',
  // Sketching · FIG. 4.5
  'TewBJLbc9qg8wFsOeqcZ5cPyKQ.png':
    'Charcoal drawing of a hand in a spiral sketchbook, lying on a patterned red and black cloth beside a pencil.',
  // Sketching · FIG. 4.6
  'UwqDbCB0URUOaV1HtDtjuz9YzE.png':
    'Four pastel studies on separate cards, an eye, lips, a nose with a nose stud and an ear, laid out on a stone surface with pastel sticks.',
  // Sketching · FIG. 4.7
  'L6lUNQG0zTeDkKzI3vmGnZwut4.png':
    'Black-and-white photo of a sketchbook page with a graphite drawing of two hands reaching toward each other, pencils lying beside it.',
  // ─── Play (C-100) ───
  // FIG. 2 · ExpressLanes
  'sgdIeQ2FYc9vdl8NcEV3RS8g.jpg':
    'Laptop on a light grey background showing an Express Lanes home page: a navigation bar with Pay Tolls, Learn your Lanes, Map your Trip and Payment Options, a red scam-warning banner, the heading “A Decade of Giving to Our Region!” and three illustrated cards: Pay Tolls, Prevent Future Invoices and Learn your lanes.',
  // FIG. 3 · Teachable AI (served from framerusercontent.com; has audio)
  '6GwunOSeX0YVHJspIvJG7W3Q.mp4':
    'Phone screen recording of an object-finding app, run as a preview in Google AI Studio. The user trains it on a pair of brown glasses, capturing views on a wooden floor and a grey rug (“Position object and tap capture”, “Analyzing view...”) until “Training Complete”. In find mode, looking for Brown Glasses, the camera pans around a room while the screen reads “SEARCHING... Slowly move your phone from left to right.”, then circles the glasses on a coffee table: “Glasses are ahead, about 3 feet away on the coffee table. Walk forward a few steps.” and finally “Your glasses are directly ahead, at arm\'s length on the coffee table. Reach straight ahead.”',
  // FIG. 5 · Educademy
  'bDbWbcvql01Q5iZy5tdbwCEUt0.jpg':
    'Two tilted phones floating on lavender: a purple splash screen with an illustration of a parent helping a child at a desk and the words “Educademy, Homeschooling made easy.”, and a parent’s home screen greeting Sophie with upcoming assignments and resources.',
};

/** The draft for a media file ('' if none). Components pass '' themselves for decorative duplicates. */
export function alt(file: string): string {
  return altDrafts[file] ?? '';
}
