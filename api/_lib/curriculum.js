/**
 * Teaching curriculum — preparation notes for the weekend programme.
 *
 * This is written to be *taught from*, not read out. Every topic carries the
 * same five things, because that is what actually holds a room of first-year
 * B.Tech students:
 *
 *   say     one sentence to open with, in plain words
 *   why     why they should care, with an Indian example where possible
 *   analogy the non-technical picture that makes it stick
 *   demo    something to show live — attention dies without it
 *   ask     the questions students genuinely raise, and honest answers
 *   depth   where to stop, so a 40-minute topic does not become 90
 *
 * Edited in git, not the database: it is teaching material that benefits from
 * review and history. The DSA module is deliberately empty here and filled in
 * from the admin panel, because those questions are the mentor's own.
 */

export const MODULES = [
  /* ════════════════════════════════════════════════════════════════════ */
  {
    id: 'ai',
    title: 'AI & Machine Learning',
    blurb: 'What it actually is, how it works underneath, and what a fresher can realistically build.',
    sessions: [
      {
        id: 'ai-1',
        title: 'What AI really is',
        mins: 90,
        goal: 'Kill the magic. By the end they should know AI is pattern-fitting on data, not thinking.',
        topics: [
          {
            t: 'AI vs Machine Learning vs Deep Learning',
            say: 'AI is the goal, machine learning is the main method, deep learning is one very successful kind of machine learning.',
            why: 'Students use the three words interchangeably in interviews and it immediately marks them as surface-level.',
            analogy: 'AI is "transport". ML is "engines". Deep learning is "jet engines" — one kind of engine that turned out to work extremely well.',
            demo: 'Draw three nested circles on the board. Put chess-playing rules in the outer one, spam filters in the middle, ChatGPT in the centre.',
            ask: [
              ['Is every AI machine learning?', 'No. Old chess engines and rule-based systems are AI with no learning at all — a human wrote every rule.'],
              ['Why did deep learning win?', 'Three things arrived together around 2012: cheap GPUs, huge labelled datasets, and better training tricks. None alone was enough.'],
            ],
            depth: 'Do not define a perceptron yet. Names and boundaries only.',
          },
          {
            t: 'Supervised, unsupervised, reinforcement',
            say: 'Either you show the model the right answers, or you let it find structure itself, or you let it try things and score it.',
            why: 'Almost every ML interview opens here, and it is the frame for every algorithm they will meet later.',
            analogy: 'Supervised is studying with an answer key. Unsupervised is sorting a messy drawer with no instructions. Reinforcement is learning cricket by playing and watching the scoreboard.',
            demo: 'Same dataset of students, three questions: predict marks (supervised), group similar students (unsupervised), pick what to teach next for the highest gain (reinforcement).',
            ask: [
              ['Which is used most in industry?', 'Supervised, by a very wide margin. Most business value is prediction where labels already exist.'],
              ['Where does ChatGPT fit?', 'Self-supervised pre-training — labels generated from the text itself — then reinforcement learning from human feedback on top.'],
            ],
            depth: 'Name semi-supervised and self-supervised, do not teach them.',
          },
          {
            t: 'How a model actually learns',
            say: 'Guess, measure how wrong you were, nudge the numbers so next time you are less wrong, repeat a million times.',
            why: 'This single loop is all of training. Once they see it, backpropagation stops being frightening.',
            analogy: 'Adjusting a shower tap. Too cold, turn a bit. Too hot, turn back less. The "loss" is how far the temperature is from what you want.',
            demo: 'Fit y = mx + c to five points by hand on the board. Show the error shrinking as you adjust m. That is gradient descent without the calculus.',
            ask: [
              ['Do I need heavy maths?', 'To use models, no. To design them, yes — linear algebra and calculus. Be honest: most jobs are the first kind.'],
              ['What is an epoch?', 'One full pass over the training data. Many passes are needed because each pass only nudges slightly.'],
            ],
            depth: 'No chain rule. "Gradient = direction that reduces error" is enough today.',
          },
          {
            t: 'Overfitting — the one failure they must recognise',
            say: 'A model that memorises the training data looks brilliant in practice and fails completely on anything new.',
            why: 'It is the most common real bug in student projects and a guaranteed interview question.',
            analogy: 'Mugging up previous year papers versus understanding the subject. Ninety-eight in the mock, thirty in the actual exam because the questions changed.',
            demo: 'Show a curve bending through every noisy point versus a straight line. Ask which they would bet money on for the next point.',
            ask: [
              ['How do I know it is overfitting?', 'Training accuracy keeps climbing while validation accuracy stalls or drops. Always keep a validation split.'],
              ['How do I fix it?', 'More data first. Then simplify the model, add regularisation or dropout, and stop training earlier.'],
            ],
            depth: 'Mention the bias-variance tradeoff by name only; the formal version is a second-year topic.',
          },
        ],
      },
      {
        id: 'ai-2',
        title: 'How large language models work',
        mins: 90,
        goal: 'They should be able to explain next-token prediction and why hallucination is structural, not a bug.',
        topics: [
          {
            t: 'Next-token prediction',
            say: 'A language model does exactly one thing: given the text so far, guess the next chunk. Everything else is that, repeated.',
            why: 'Every misconception about AI dissolves once this lands. It reframes the whole field.',
            analogy: 'Phone keyboard autocomplete, trained on a very large fraction of the internet instead of your messages.',
            demo: 'Type a half sentence and have the class shout the next word. Note that they disagree — and that the model also has a probability spread.',
            ask: [
              ['Then how does it answer questions?', 'Because the most likely continuation of a question in its training data was an answer. It is imitating the shape of answers.'],
              ['Does it understand?', 'Honest answer: it captures structure and relationships extremely well, and there is genuine disagreement about whether that counts as understanding. Do not overclaim in either direction.'],
            ],
            depth: 'Tokens as "word pieces" is enough. No byte-pair encoding detail.',
          },
          {
            t: 'Why models hallucinate',
            say: 'It always produces the most plausible continuation. Plausible and true are different things, and it cannot tell them apart.',
            why: 'Students trust output blindly, and it is the single most damaging habit in their projects.',
            analogy: 'A confident classmate who never says "I do not know" — fluent, persuasive, and sometimes entirely wrong.',
            demo: 'Ask a model for citations on a niche topic and check them live. Some will not exist. This lands harder than any explanation.',
            ask: [
              ['Can it be fixed?', 'Reduced, not removed. Grounding it in real documents (RAG) and asking for sources helps a lot. Verification stays your job.'],
              ['Why does it sound so sure?', 'Because confident text was more common in training data than hedging. Tone is imitated, not earned.'],
            ],
            depth: 'Name RAG; the next session covers it.',
          },
          {
            t: 'Prompting that actually works',
            say: 'Give it a role, the context, the task, and the output format. Vague in, vague out.',
            why: 'This is the highest-leverage skill they can take away today, usable from tomorrow.',
            analogy: 'Briefing a new intern. "Make it better" gets you nothing; a clear brief gets you work you can use.',
            demo: 'Same task, two prompts, side by side. Lazy one first so the improvement is obvious.',
            ask: [
              ['Is prompt engineering a real job?', 'As a standalone title it is fading. As a skill inside engineering roles it is now assumed, like knowing how to search well.'],
              ['Which model should I use?', 'Try the same prompt on two or three. They differ by task and they change every few months.'],
            ],
            depth: 'Few-shot examples and chain-of-thought are enough. Skip exotic techniques.',
          },
          {
            t: 'RAG — giving a model your own data',
            say: 'Retrieve the relevant chunks from your documents, paste them into the prompt, then ask the question.',
            why: 'It is the single most common real AI system in industry, and a realistic, impressive student project.',
            analogy: 'An open-book exam. The model is not smarter, it just has the right page open.',
            demo: 'Architecture on the board: documents → chunks → embeddings → vector store → retrieve top k → prompt → answer.',
            ask: [
              ['Is this fine-tuning?', 'No, and confusing them is a common interview trip. RAG changes what the model sees; fine-tuning changes the model itself.'],
              ['When do I fine-tune instead?', 'For style, format or a narrow task. For facts, almost always use RAG — facts change, weights do not.'],
            ],
            depth: 'Embeddings as "meaning becomes coordinates, similar things sit close" is enough.',
          },
        ],
      },
      {
        id: 'ai-3',
        title: 'Building with AI, and the job market',
        mins: 90,
        goal: 'They leave with a project they can actually start this week and a realistic view of AI roles.',
        topics: [
          {
            t: 'Projects that get noticed',
            say: 'Solve a problem you personally have, with real data, and deploy it where someone else can click it.',
            why: 'Every fresher CV has the same Titanic notebook. Specific beats sophisticated at this level.',
            analogy: 'A cooked meal someone ate beats a photo of your ingredients.',
            demo: 'Contrast two CV lines: "Built an ML model (Kaggle)" versus "Built a tool that reads my college notice PDFs and answers questions — 60 classmates use it".',
            ask: [
              ['Will interviewers care that I used an API?', 'They care that it works, that people use it, and that you can explain the tradeoffs. Building a model from scratch is not the bar.'],
              ['How big should it be?', 'Small and finished beats ambitious and abandoned. Ship in two weeks, then improve.'],
            ],
            depth: 'Have three or four concrete project ideas ready, sized to a fortnight.',
          },
          {
            t: 'The honest state of AI jobs',
            say: 'Very few freshers are hired to train models. Most build products that use them.',
            why: 'They are being sold a fantasy of research roles and will aim at the wrong target for a year.',
            analogy: 'Few people design engines. Very many build cars, and that is where the jobs are.',
            demo: 'Open three real fresher job posts and read the requirements aloud. Note how many say Python, APIs and SQL rather than research.',
            ask: [
              ['Do I need an MTech or PhD?', 'For research roles yes, usually. For the large majority of AI engineering jobs, no.'],
              ['Will AI take these jobs?', 'It is removing the routine parts. Judgement, debugging, system design and knowing what to build are rising in value, not falling.'],
            ],
            depth: 'Stay concrete and current. Do not speculate about ten years out.',
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════ */
  {
    id: 'blockchain',
    title: 'Blockchain & Web3',
    blurb: 'The real mechanism, the genuine uses, and the honesty to say where it is not the answer.',
    sessions: [
      {
        id: 'bc-1',
        title: 'What a blockchain actually is',
        mins: 90,
        goal: 'They can explain a blockchain without saying "crypto", and can say when it is the wrong tool.',
        topics: [
          {
            t: 'The problem it solves',
            say: 'How do strangers who do not trust each other agree on one shared record, with nobody in charge?',
            why: 'Almost nobody teaches the problem first, which is why blockchain feels like a solution floating in space.',
            analogy: 'A shared cricket scorebook where everyone keeps a copy, every entry is announced aloud, and altering an old page would mean redoing every page after it in front of everyone.',
            demo: 'Ask how they would settle a group expense with no trusted friend and no bank. Let them invent a shared ledger themselves.',
            ask: [
              ['Why not just a database?', 'The right question, and usually the right answer. A blockchain is only worth it when there is no party everyone trusts to hold the database.'],
              ['Is blockchain the same as Bitcoin?', 'Bitcoin is the first application. The blockchain is the ledger technique underneath it.'],
            ],
            depth: 'Keep it as a trust problem. No hashing yet.',
          },
          {
            t: 'Blocks, hashes and immutability',
            say: 'Each block carries a fingerprint of the one before, so changing old history breaks every fingerprint after it.',
            why: 'This is the actual mechanism. Without it, "immutable" is a word they repeat without meaning.',
            analogy: 'Numbered pages where each page writes down a summary of the previous one. Tear out page 40 and pages 41 onward stop matching.',
            demo: 'Chain four boxes on the board, each holding the previous box\'s hash. Change box 2 and visibly break 3 and 4.',
            ask: [
              ['What is a hash?', 'A fixed-length fingerprint of any input. Same input, same fingerprint; change one character and it looks completely different.'],
              ['Can it be hacked?', 'Rewriting history means redoing all the work after it, faster than the rest of the network combined. Expensive rather than impossible.'],
            ],
            depth: 'SHA-256 as a black box. No internals.',
          },
          {
            t: 'Consensus: proof of work and proof of stake',
            say: 'Some rule has to decide whose block is next. Either you burn electricity to earn the right, or you lock up money you lose for cheating.',
            why: 'It explains both the energy criticism and why Ethereum changed, which they will be asked about.',
            analogy: 'Proof of work is a lottery where more tickets cost more electricity. Proof of stake is a deposit you forfeit if you misbehave.',
            demo: 'Ethereum\'s 2022 move to proof of stake cut its energy use by about 99.9%. One number, memorable.',
            ask: [
              ['Is mining still worth it?', 'For Bitcoin, only at industrial scale with very cheap power. Not on a laptop.'],
              ['Which is better?', 'Proof of stake is far cheaper and faster; proof of work has a longer track record of security. Genuine tradeoff.'],
            ],
            depth: 'Two mechanisms only. Skip the dozen variants.',
          },
          {
            t: 'Smart contracts',
            say: 'Code that lives on the chain and runs exactly as written, which is both the feature and the danger.',
            why: 'It is where the developer jobs are, and where the famous failures came from.',
            analogy: 'A vending machine. Put in the right coin, the product comes out — no shopkeeper, no discretion, no mercy if you put in the wrong coin.',
            demo: 'Eight lines of Solidity on the board. Then mention the 2016 DAO hack: roughly $60M drained through a re-entrancy bug in code that did exactly what it said.',
            ask: [
              ['Can a bug be patched?', 'Not directly — deployed code is immutable. Teams use upgrade proxy patterns, which bring their own risks.'],
              ['What language?', 'Solidity for Ethereum-compatible chains. Rust for Solana.'],
            ],
            depth: 'Read one contract. Do not teach Solidity syntax properly today.',
          },
        ],
      },
      {
        id: 'bc-2',
        title: 'Where it works, where it does not',
        mins: 60,
        goal: 'Honest judgement — they should be able to argue both sides credibly.',
        topics: [
          {
            t: 'Uses that genuinely hold up',
            say: 'Cross-border payments, supply-chain provenance, and records where several rival organisations must share one truth.',
            why: 'Balance. Teaching only hype or only cynicism both leave them unable to reason.',
            analogy: 'Useful exactly where a neutral referee is needed and no single party can be it.',
            demo: 'Remittance: traditional corridors often take days and several percent; stablecoin rails move it in minutes for cents. That is a real problem for Indian families.',
            ask: [
              ['Is it all a scam?', 'No — but the ratio of speculation to working product has been poor. Judge projects by whether anyone uses them for something other than trading.'],
              ['Should I invest?', 'Stay out of advising. Teach the technology; say clearly that you do not give investment advice.'],
            ],
            depth: 'Two or three solid examples beats a list of twenty.',
          },
          {
            t: 'Where a normal database wins',
            say: 'If one organisation controls the data, a database is faster, cheaper and simpler. Use it.',
            why: 'The ability to say "this does not need a blockchain" is what separates an engineer from a hype-follower.',
            analogy: 'Using a courier with signature tracking to pass a note to the person sitting beside you.',
            demo: 'A three-question test on the board: multiple distrusting writers? no acceptable central authority? need public verifiability? Any "no" and it is a database.',
            ask: [
              ['So why do companies announce blockchain projects?', 'Some genuinely need it. Many wanted the announcement. Both are true.'],
            ],
            depth: 'The three-question test is the takeaway. Make them write it down.',
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════ */
  {
    id: 'emerging',
    title: 'Emerging Technologies',
    blurb: 'A working map of the rest of the landscape, so nothing sounds like a foreign language.',
    sessions: [
      {
        id: 'em-1',
        title: 'Cloud, DevOps and how software actually ships',
        mins: 90,
        goal: 'They understand what happens between "it works on my laptop" and "strangers are using it".',
        topics: [
          {
            t: 'What the cloud actually is',
            say: 'Somebody else\'s computers, rented by the minute, in a building with better power and network than you can afford.',
            why: 'Cloud words are on every job description and most students have only a vague feeling about them.',
            analogy: 'Renting a flat instead of building a house. IaaS is an empty flat, PaaS is furnished, SaaS is a hotel room.',
            demo: 'Deploy something live in front of them. Vercel or Render, laptop to public URL, under five minutes.',
            ask: [
              ['AWS, Azure or GCP?', 'AWS has the most jobs in India. The concepts transfer; do not agonise over the choice.'],
              ['Is it cheaper?', 'Cheaper to start and to fail. Often more expensive at large steady scale. That tradeoff is the whole industry conversation.'],
            ],
            depth: 'IaaS/PaaS/SaaS and one live deploy. No pricing models.',
          },
          {
            t: 'Containers and why Docker exists',
            say: 'Ship the application together with everything it needs to run, so the target machine stops mattering.',
            why: 'It is the answer to "works on my machine", which every one of them has already lived through.',
            analogy: 'Shipping containers. The port does not care what is inside; it only has to handle one standard box.',
            demo: 'A five-line Dockerfile. Build, run, show the same image working somewhere else.',
            ask: [
              ['Is it a virtual machine?', 'No. A VM carries a whole operating system; a container shares the host kernel. That is why it starts in a second, not a minute.'],
              ['Do I need Kubernetes?', 'Not as a fresher. Know what it is for; learn it when a job requires it.'],
            ],
            depth: 'Docker properly, Kubernetes as a name only.',
          },
          {
            t: 'CI/CD and version control as a professional',
            say: 'Every push runs the tests automatically, and if they pass it deploys itself.',
            why: 'The single biggest gap between student code and workplace code, and it is easy to close.',
            analogy: 'A conveyor belt with quality checks, instead of one person carrying each item by hand and hoping.',
            demo: 'A GitHub Actions file running tests on push. Break a test deliberately and show it blocking the merge.',
            ask: [
              ['Do I need tests for a college project?', 'One or two show intent, and interviewers notice. You do not need full coverage.'],
              ['Why do branches matter?', 'So broken work never touches what other people depend on. It is how teams avoid standing on each other.'],
            ],
            depth: 'Branch, pull request, review, merge. That is the professional loop.',
          },
        ],
      },
      {
        id: 'em-2',
        title: 'Cybersecurity basics every developer owes',
        mins: 90,
        goal: 'They stop writing the three vulnerabilities that show up in almost every student project.',
        topics: [
          {
            t: 'How passwords must be stored',
            say: 'Never store the password. Store a slow, salted hash of it, and compare hashes.',
            why: 'Student projects store plaintext passwords constantly, and one breach makes it a real-world harm.',
            analogy: 'A locker with a combination only the owner knows. You keep a way to check the combination, not the combination.',
            demo: 'bcrypt in five lines. Show the same password hashing differently twice because of the salt.',
            ask: [
              ['Why not SHA-256?', 'It is designed to be fast, which helps an attacker guess billions per second. bcrypt and argon2 are deliberately slow.'],
              ['What is a salt?', 'Random data mixed in per user, so identical passwords do not produce identical hashes and precomputed tables fail.'],
            ],
            depth: 'Use a library. Never invent this.',
          },
          {
            t: 'Injection and why you never build queries with strings',
            say: 'If user input becomes part of your query text, the user can rewrite your query.',
            why: 'Decades old, still in the OWASP top ten, still everywhere in student code.',
            analogy: 'Letting a guest write on your order form. They add "and give me everything free" and the kitchen obeys.',
            demo: 'Type \' OR \'1\'=\'1 into a login box on a deliberately vulnerable demo. Then show the parameterised version refusing it.',
            ask: [
              ['Does an ORM protect me?', 'Mostly, until you drop to raw SQL for something complex. That is exactly where the bug appears.'],
              ['Is this only SQL?', 'No. Command injection, NoSQL injection and XSS are the same mistake in different clothes: mixing data with instructions.'],
            ],
            depth: 'Parameterised queries. That is the rule; the rest is detail.',
          },
          {
            t: 'Secrets, tokens and what never goes in git',
            say: 'API keys belong in environment variables, never in the repository, and definitely not in the frontend.',
            why: 'Bots scan public GitHub for leaked keys within minutes, and students have been billed thousands.',
            analogy: 'Taping your house key to the front door and hoping nobody reads the note.',
            demo: 'A .env.example with placeholders, .env in .gitignore. Note that git history keeps a leaked key even after you delete the file.',
            ask: [
              ['I removed it in the next commit, am I safe?', 'No. It is still in history. Rotate the key — assume it is compromised.'],
              ['How do I call a paid API from the frontend?', 'You do not. Put a small backend in between; anything in the browser is public.'],
            ],
            depth: 'Environment variables and rotation. Skip secret managers for now.',
          },
        ],
      },
      {
        id: 'em-3',
        title: 'The rest of the map',
        mins: 60,
        goal: 'Vocabulary and honest signal-to-noise, so no buzzword intimidates them.',
        topics: [
          {
            t: 'IoT and edge computing',
            say: 'Small devices that sense and act, increasingly deciding locally instead of sending everything to a server.',
            why: 'Large in Indian manufacturing, agriculture and logistics, and under-taught in colleges.',
            analogy: 'A security guard who can act on what they see, rather than phoning head office about every visitor.',
            demo: 'A smart traffic signal that counts vehicles on-device. Cheaper bandwidth, and it keeps working when the network drops.',
            ask: [
              ['Is it just sensors?', 'Sensors are the easy part. Power, connectivity, security and fleet updates are the hard parts.'],
            ],
            depth: 'Concept and one example. Electronics is not the point.',
          },
          {
            t: 'AR, VR and spatial computing',
            say: 'AR adds to what you see; VR replaces it.',
            why: 'Real jobs in training, healthcare and retail; also a field with recurring hype cycles.',
            analogy: 'AR is a windscreen showing directions on the road ahead. VR is a flight simulator.',
            demo: 'Surgical and industrial training — repeat a dangerous procedure a hundred times with no risk and no consumables.',
            ask: [
              ['Is the metaverse dead?', 'That branding largely collapsed. The underlying tech continues in training and industrial use, which is where it always worked.'],
            ],
            depth: 'Distinction and use cases. Do not defend or attack the hype.',
          },
          {
            t: 'Quantum computing — what is true today',
            say: 'Real machines exist, they are small and error-prone, and they break a narrow class of problems rather than making everything faster.',
            why: 'Deeply misreported. They should be able to correct a room confidently.',
            analogy: 'Not a faster car. A different vehicle that only helps on certain terrain.',
            demo: 'Shor\'s algorithm would break today\'s RSA — which is why post-quantum cryptography is being standardised now, years ahead.',
            ask: [
              ['Should I learn it now?', 'Only out of genuine interest. It is not a fresher hiring market, and the field will look different when it is.'],
              ['Will it break Bitcoin?', 'Eventually, in theory. Both cryptography and these protocols are expected to migrate first.'],
            ],
            depth: 'Say "superposition lets it explore many states at once" and stop. Do not attempt the physics.',
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════ */
  {
    id: 'marketing',
    title: 'Marketing for Engineers',
    blurb: 'Why the better product often loses, and the minimum an engineer needs to not be replaceable.',
    sessions: [
      {
        id: 'mk-1',
        title: 'What marketing actually is',
        mins: 90,
        goal: 'Break the idea that marketing means advertising, and that it is not their problem.',
        topics: [
          {
            t: 'Marketing is not advertising',
            say: 'Marketing is understanding who needs this, what it is worth to them, and how they find it. Advertising is one small tactic inside that.',
            why: 'Engineers dismiss marketing and then cannot explain why their better project has no users.',
            analogy: 'A brilliant restaurant down an unmarked lane with no board and no menu. The food is not the problem.',
            demo: 'Ask who has built something nobody used. Most hands go up. That gap is what this session is about.',
            ask: [
              ['Is this not the sales team\'s job?', 'Sales closes the people marketing brought. And in a startup, or in your own project, you are both.'],
              ['Why should a developer care?', 'Because engineers who can explain business value get promoted, get funded, and get listened to in the room.'],
            ],
            depth: 'Keep it about their own projects, not corporate theory.',
          },
          {
            t: 'The 4 Ps, applied to something they built',
            say: 'Product, Price, Place, Promotion — what it is, what it costs, where it is found, how people hear about it.',
            why: 'The oldest framework, still the fastest way to find the hole in a plan.',
            analogy: 'A four-legged stool. One weak leg and it tips, however good the other three are.',
            demo: 'Take a student project live and fill in all four columns on the board. Promotion is almost always blank — that is the lesson.',
            ask: [
              ['Is this not outdated?', 'It is a checklist, not a theory. Newer frameworks are refinements; this one still catches the obvious gaps.'],
              ['How do I price something?', 'Not from your costs. From the value to the buyer and what alternatives cost them.'],
            ],
            depth: 'One worked example beats defining all four abstractly.',
          },
          {
            t: 'Customer, segment, positioning',
            say: 'You cannot build for everyone. Pick a specific person, and say plainly why you are the right choice for them.',
            why: 'Student projects are always "for everyone", which is why they are for no one.',
            analogy: 'A tailor measuring one customer versus a factory making one shirt in one size and hoping.',
            demo: 'Rewrite a vague line together: "an app for students" → "attendance tracking for first-year B.Tech students in colleges that still use paper registers".',
            ask: [
              ['Does narrowing not shrink my market?', 'Initially yes, and it is how almost every large company started. Amazon sold only books.'],
              ['How do I find my segment?', 'Talk to twenty real people. Not a survey — conversations, where you listen more than you pitch.'],
            ],
            depth: 'They should leave with their own project narrowed to one sentence.',
          },
        ],
      },
      {
        id: 'mk-2',
        title: 'Digital marketing they can actually use',
        mins: 90,
        goal: 'Practical channels for a project, a portfolio or a small business — nothing theoretical.',
        topics: [
          {
            t: 'The funnel',
            say: 'People move from never having heard of you, to knowing you, to trying you, to paying, to telling others. Each step loses most of them.',
            why: 'It turns "nobody uses my app" into a specific, fixable question about which step is leaking.',
            analogy: 'A leaky pipe. Fixing the wrong joint does nothing; find where the water is actually escaping.',
            demo: 'Real numbers: 1,000 see it, 100 click, 10 sign up, 1 pays. Ask which step to improve first — and why the last one is usually wrong.',
            ask: [
              ['What is a good conversion rate?', 'Wildly context-dependent. Compare against your own last month, not against an article.'],
              ['Where do most projects leak?', 'Awareness, almost always. The product is fine; nobody knows it exists.'],
            ],
            depth: 'Awareness → interest → action → retention. Four stages is plenty.',
          },
          {
            t: 'SEO, in the terms an engineer already thinks in',
            say: 'Make the page fast, make it say clearly what it is, and get other real sites to link to it.',
            why: 'Directly applicable to their portfolio, and it is largely an engineering problem.',
            analogy: 'A library index. If your book has no title on the spine and sits in the wrong section, nobody finds it.',
            demo: 'Open their own portfolio. Check the title tag, meta description, load speed, mobile view. Most fail on at least two.',
            ask: [
              ['Is SEO dead because of AI search?', 'Changing, not dead. Assistants still need to find and cite sources; structured, clear content matters more, not less.'],
              ['How long does it take?', 'Months. It compounds. It is the opposite of ads, which stop the day you stop paying.'],
            ],
            depth: 'Title, description, speed, mobile, links. Skip keyword tooling.',
          },
          {
            t: 'Content and personal brand, without cringe',
            say: 'Write about what you are genuinely learning. Over a year it becomes the reason people approach you.',
            why: 'For a fresher in India, a visible LinkedIn or GitHub presence often beats a slightly better CGPA.',
            analogy: 'Compound interest. Tiny, consistent, boring — then suddenly it is a large number.',
            demo: 'Show a real engineer\'s progression: first posts small and awkward, then steady, then inbound offers. Normalise starting badly.',
            ask: [
              ['I have nothing worth sharing.', 'You do — what confused you last week and how you resolved it. Beginners explain to beginners better than experts do.'],
              ['How often?', 'Once a week, sustained for a year, beats daily for a fortnight.'],
            ],
            depth: 'Have them draft one post in the room. Momentum matters more than polish.',
          },
          {
            t: 'Reading the numbers',
            say: 'Pick two or three metrics that map to your goal and ignore the ones that only flatter you.',
            why: 'Engineers over-collect and under-decide. Also the entry point to data-informed thinking.',
            analogy: 'A dashboard with 40 dials. A pilot watches six.',
            demo: 'Vanity versus real: page views against sign-ups; followers against replies; downloads against week-two retention.',
            ask: [
              ['Which tool?', 'Anything free to start. The discipline of checking weekly matters more than the tool.'],
              ['What if the numbers are tiny?', 'Then talk to the ten people you do have. Small numbers need conversations, not analytics.'],
            ],
            depth: 'One goal, two metrics. Resist building a dashboard.',
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════ */
  {
    id: 'dsa',
    title: 'DSA',
    blurb: 'Your own plan and question bank — added and edited from this panel.',
    ownerEditable: true,
    sessions: [],
  },
];

/** A suggested four-weekend route through the material. */
export const TRACKS = [
  {
    id: 'default',
    title: 'Four weekends — the standard run',
    note: 'Saturday is the group session below; Sunday is 1:1 on whatever that student needs.',
    weeks: [
      { week: 1, title: 'AI, properly understood', sessions: ['ai-1', 'ai-2'],
        note: 'Highest pull, so lead with it. Ends with them able to explain LLMs to a friend.' },
      { week: 2, title: 'Building and shipping', sessions: ['ai-3', 'em-1'],
        note: 'Pair the AI project idea with an actual deploy, so week 2 ends with something live.' },
      { week: 3, title: 'Blockchain and security', sessions: ['bc-1', 'bc-2', 'em-2'],
        note: 'Blockchain satisfies curiosity; security is the part that changes how they write code.' },
      { week: 4, title: 'The wider map and marketing', sessions: ['em-3', 'mk-1', 'mk-2'],
        note: 'Close on marketing — it reframes every project they build afterwards.' },
    ],
  },
];

/** Teaching habits that apply to every session. */
export const PRINCIPLES = [
  ['Open with the problem, never the solution', 'Nobody remembers a definition they had no reason to want.'],
  ['One live demo per session, minimum', 'Attention collapses about twenty minutes into pure talking.'],
  ['Say "I do not know" out loud', 'It buys more credibility than a confident guess, and it models the habit you want from them.'],
  ['Indian examples first', 'UPI, IRCTC, Flipkart and Zerodha land harder than Netflix and Uber.'],
  ['Make them write one sentence', 'Ending every topic with "write it in your own words" exposes who has actually followed.'],
  ['Name what you are skipping', 'It stops the topic sprawling and tells them the map continues past today.'],
];
