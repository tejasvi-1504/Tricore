/**
 * Teaching curriculum — preparation notes for the weekend programme.
 *
 * This is written to be *taught from*, not read out. Every topic carries the
 * same six things, because that is what actually holds a room of first-year
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
    id: 'ml',
    title: 'Machine Learning',
    blurb: 'The engine room: how a machine learns from data, the algorithms worth knowing, and how to tell a good model from a lucky one.',
    sessions: [
      {
        id: 'ml-1',
        title: 'How a machine learns at all',
        mins: 90,
        goal: 'Kill the magic. By the end they should see ML as fitting numbers to data, not thinking.',
        topics: [
          {
            t: 'What "learning" means to a machine',
            say: 'Nobody writes the rules. You show it enough examples and it works out the rules itself.',
            why: 'Every student arrives thinking ML is programmed intelligence. Until this flips, nothing else lands.',
            analogy: 'Teaching a child "cat" — you never define whiskers and tails, you point at forty cats and they generalise.',
            demo: 'Write the rules for spotting spam on the board. Watch the list break on every counter-example they shout. Then say: that is why we learn them from data.',
            ask: [
              ['So it writes its own code?', 'No. The code is fixed; the numbers inside it change. Those numbers are the weights, and "training" means finding good ones.'],
              ['How much data do I need?', 'Depends on the problem, but "more than you think" is usually right. Hundreds for simple tasks, millions for images and language.'],
            ],
            depth: 'No maths yet. The idea of learning-from-examples is the whole session opener.',
          },
          {
            t: 'Supervised, unsupervised, reinforcement',
            say: 'Either you show it the right answers, or you let it find structure alone, or you let it try things and score it.',
            why: 'The frame for every algorithm they will ever meet, and the most common opening interview question.',
            analogy: 'Supervised is studying with an answer key. Unsupervised is sorting a messy drawer with no instructions. Reinforcement is learning cricket by playing and watching the scoreboard.',
            demo: 'One dataset of students, three questions: predict marks (supervised), group similar students (unsupervised), choose what to teach next for the biggest gain (reinforcement).',
            ask: [
              ['Which is used most in industry?', 'Supervised, by a wide margin. Most business value is prediction where labels already exist.'],
              ['Why is unsupervised harder?', 'Because there is no right answer to check against. You are judging whether the groups are useful, which is a human call.'],
            ],
            depth: 'Name semi-supervised and self-supervised; do not teach them.',
          },
          {
            t: 'Features — the part that decides everything',
            say: 'A feature is one measurable thing about an example. Choosing good ones matters more than choosing a clever algorithm.',
            why: 'Students obsess over model choice and ignore features, which is backwards for almost every real problem.',
            analogy: 'Predicting exam results from attendance, past marks and sleep. Choose shoe size instead and no algorithm can save you.',
            demo: 'Predict house price. Let them shout features — area, bedrooms, location, age. Then ask "house number?" and let them explain why it is useless.',
            ask: [
              ['Can I just throw everything in?', 'You can, and it often hurts. Irrelevant features add noise and make overfitting easier.'],
              ['What about text and images?', 'They get converted to numbers — counts, embeddings, pixel values. Everything becomes numbers eventually.'],
            ],
            depth: 'Feature engineering as a concept. Scaling and encoding come in session 4.',
          },
          {
            t: 'The learning loop: guess, measure, nudge',
            say: 'Guess, measure how wrong you were, nudge the numbers so next time you are less wrong, repeat.',
            why: 'This single loop is all of training. Once seen, gradient descent and backpropagation stop being frightening words.',
            analogy: 'Adjusting a shower tap. Too cold, turn a bit. Too hot, turn back less. The loss is how far you are from the temperature you want.',
            demo: 'Fit y = mx + c to five points by hand on the board. Show the error shrinking as you adjust m. That is gradient descent without calculus.',
            ask: [
              ['What is a loss function?', 'The number that says how wrong the model is. Training is just making that number small.'],
              ['What is learning rate?', 'How big each nudge is. Too big and it overshoots forever; too small and it takes all day.'],
              ['What is an epoch?', 'One full pass over the training data. Many passes are needed because each pass only nudges slightly.'],
            ],
            depth: 'No chain rule. "Gradient = the direction that reduces error" is enough.',
          },
        ],
      },
      {
        id: 'ml-2',
        title: 'The algorithms worth knowing',
        mins: 90,
        goal: 'Six algorithms, what each is for, and the instinct to pick one — not to derive them.',
        topics: [
          {
            t: 'Linear regression — predicting a number',
            say: 'Draw the straight line that best fits the points, then use it to predict.',
            why: 'The simplest useful model and the mental template for everything that follows.',
            analogy: 'Estimating a taxi fare from distance. Roughly a fixed charge plus a rate per kilometre — that is literally c and m.',
            demo: 'Plot area against price for six houses. Draw the line. Predict an unseen house and let them sanity-check it.',
            ask: [
              ['Is it too simple to be useful?', 'Often it is the right answer, and it is always the right baseline. If your neural network cannot beat it, something is wrong.'],
              ['What if the relationship curves?', 'Add polynomial features or use a different model. Linear does not mean the world is straight, it means the equation is.'],
            ],
            depth: 'No normal equation, no matrix form.',
          },
          {
            t: 'Logistic regression — predicting a class',
            say: 'Same idea, but squashed into a probability between 0 and 1, then thresholded into yes or no.',
            why: 'Classification is most of real ML, and this is the workhorse that is still deployed everywhere.',
            analogy: 'A dimmer switch rather than a number line — it outputs "how likely", not "how much".',
            demo: 'Will this student pass? Show hours-studied on the x-axis and an S-curve rising from 0 to 1. Point at the 0.5 crossing.',
            ask: [
              ['Why "regression" if it classifies?', 'Historical naming. It regresses on the log-odds, then converts. Everyone finds it confusing; say so.'],
              ['Where is it used in production?', 'Credit scoring, click prediction, medical risk. It is fast and, importantly, explainable — which regulators require.'],
            ],
            depth: 'Sigmoid as "squash into 0–1". No log-odds derivation.',
          },
          {
            t: 'Decision trees and random forests',
            say: 'A flowchart of yes/no questions learned from data — and a forest is hundreds of them voting.',
            why: 'The most intuitive model to explain, and forests still win on ordinary tabular business data.',
            analogy: 'A doctor narrowing down a diagnosis by asking one question at a time. A forest is a panel of doctors voting.',
            demo: 'Build a loan-approval tree live from their suggestions. Then show how one deep tree memorises and why many shallow ones vote better.',
            ask: [
              ['Why is a forest better than one tree?', 'One tree overfits easily. Many trees trained on different samples cancel out each other\'s mistakes.'],
              ['Do I need deep learning for tables?', 'Usually not. Gradient-boosted trees — XGBoost, LightGBM — still beat neural networks on most tabular problems.'],
            ],
            depth: 'Name gradient boosting; do not teach it today.',
          },
          {
            t: 'k-means clustering — finding groups',
            say: 'Pick k centres, assign every point to its nearest, move the centres to the middle of their group, repeat.',
            why: 'The clearest unsupervised example, and the algorithm is simple enough to run by hand.',
            analogy: 'Placing k water tanks in a city so nobody walks far. Move each tank to the middle of the people it serves, repeat.',
            demo: 'Ten points on the board, k = 2. Run three iterations by hand. They will see it settle.',
            ask: [
              ['How do I choose k?', 'The elbow method, or domain knowledge. There is no formula — this is a judgement call, and that is normal in unsupervised work.'],
              ['What is it used for?', 'Customer segmentation, grouping documents, compressing colours in an image.'],
            ],
            depth: 'Run it by hand. Skip initialisation strategies.',
          },
          {
            t: 'k-nearest neighbours — the lazy one',
            say: 'To classify something new, look at the k closest examples you already have and take a vote.',
            why: 'It has no training step at all, which usefully breaks their assumption that all models must be trained.',
            analogy: 'Guessing a neighbourhood\'s rent by asking the five nearest flats.',
            demo: 'Scatter two classes on the board. Drop a new point. Vary k from 1 to 5 and show the answer change.',
            ask: [
              ['Where is the training?', 'There is none — it stores the data and does the work at prediction time. That is why it is slow to predict and instant to "train".'],
              ['Why is it rarely used at scale?', 'Prediction cost grows with the dataset, and distance stops meaning much when you have hundreds of features.'],
            ],
            depth: 'Mention the curse of dimensionality by name and move on.',
          },
          {
            t: 'Neural networks — where they fit',
            say: 'Layers of simple functions stacked up, which together can approximate almost any pattern given enough data.',
            why: 'They arrive expecting this to be all of ML. Placing it correctly among the others is the point.',
            analogy: 'An assembly line. Early stations spot edges, middle ones spot shapes, late ones spot faces. Nobody designed those stages — they emerged.',
            demo: 'Draw three layers. Show that each connection is just a weight, and training is the same guess-measure-nudge loop from session 1.',
            ask: [
              ['When should I use one?', 'Images, audio, language, and very large datasets. For a 5,000-row spreadsheet, trees will usually beat it.'],
              ['Why "deep"?', 'Just many layers. Depth lets later layers build on the features earlier ones found.'],
            ],
            depth: 'Architecture intuition only. Backpropagation is a later course.',
          },
        ],
      },
      {
        id: 'ml-3',
        title: 'Is this model any good?',
        mins: 90,
        goal: 'They stop trusting accuracy, and can defend a model with the right number.',
        topics: [
          {
            t: 'Train, validation, test — and why three',
            say: 'Learn on one slice, tune on a second, and report honestly on a third you never touched.',
            why: 'Almost every student project reports training accuracy, which is meaningless, and interviewers know it.',
            analogy: 'Practice questions, a mock exam, and the actual board exam. Using the board paper to practise tells you nothing.',
            demo: 'Split 100 rows 70/15/15 on the board. Then show what happens if you peek at test while tuning — the number becomes a lie.',
            ask: [
              ['Can I reuse the test set?', 'Once you tune against it, it has become a validation set. Every peek leaks information.'],
              ['What ratio?', '70/15/15 or 80/10/10 are normal. With little data, use cross-validation instead.'],
            ],
            depth: 'The three-way split is the non-negotiable habit. Make them write it down.',
          },
          {
            t: 'Overfitting and underfitting',
            say: 'Overfitting is memorising the training data. Underfitting is being too simple to capture the pattern at all.',
            why: 'The most common real bug in student projects and a guaranteed interview question.',
            analogy: 'Overfitting is mugging up past papers — 98 in the mock, 30 in the real exam. Underfitting is skimming the syllabus once.',
            demo: 'Three curves over noisy points: a flat line, a sensible curve, and a curve threading every point. Ask which they would bet on for the next point.',
            ask: [
              ['How do I spot it?', 'Training accuracy keeps climbing while validation stalls or drops. That gap is the whole signal.'],
              ['How do I fix it?', 'More data first. Then a simpler model, regularisation or dropout, and early stopping.'],
              ['And underfitting?', 'Opposite: a richer model, better features, train longer.'],
            ],
            depth: 'Name the bias-variance tradeoff; the formal treatment is a later course.',
          },
          {
            t: 'Why accuracy lies',
            say: 'If 99% of transactions are genuine, a model that says "genuine" every time is 99% accurate and completely useless.',
            why: 'This single example changes how they think about evaluation permanently. Lead with it.',
            analogy: 'A doctor who tells everyone they are healthy is right most of the time and should not be practising.',
            demo: 'Put the fraud numbers on the board and let them compute 99%. Let the discomfort sit before you introduce precision and recall.',
            ask: [
              ['So when is accuracy fine?', 'When the classes are roughly balanced and both mistakes cost about the same.'],
              ['What is class imbalance?', 'When one outcome is far rarer than another — fraud, disease, defects. It is the normal case in valuable problems.'],
            ],
            depth: 'Let them feel the problem before naming the fix.',
          },
          {
            t: 'Precision, recall, F1 and the confusion matrix',
            say: 'Precision: of the ones I flagged, how many were right. Recall: of the ones that mattered, how many did I catch.',
            why: 'Asked in almost every ML interview, and consistently mixed up.',
            analogy: 'Spam filter: precision means not junking real mail; recall means not letting spam through. You cannot max both.',
            demo: 'Draw the 2x2 confusion matrix. Fill it with fraud numbers. Compute both by hand, then ask which matters more for cancer screening versus spam.',
            ask: [
              ['Which one should I optimise?', 'Depends on which mistake is worse. Missing cancer is worse than a false alarm; junking a client email is worse than seeing spam.'],
              ['What is F1?', 'Their harmonic mean — one number when you care about both. Useful for comparison, poor for decisions.'],
            ],
            depth: 'Confusion matrix, precision, recall, F1. ROC-AUC by name only.',
          },
          {
            t: 'Cross-validation',
            say: 'Split the data five ways, train five times, each time holding out a different fifth, then average.',
            why: 'Small datasets make a single split a lottery, and student datasets are almost always small.',
            analogy: 'Judging a batsman over five matches, not one innings.',
            demo: 'Draw five bars with a different fifth shaded each time. Note that every row gets to be test data exactly once.',
            ask: [
              ['Why not just split once?', 'With little data, one unlucky split can swing your score by ten points. Averaging removes that luck.'],
              ['Is it slow?', 'Five-fold means five times the training. Worth it for small data, impractical for very large models.'],
            ],
            depth: 'k-fold only. Skip stratified and nested variants.',
          },
        ],
      },
      {
        id: 'ml-4',
        title: 'The workflow nobody shows you',
        mins: 90,
        goal: 'They learn that modelling is the small part, and what the rest actually involves.',
        topics: [
          {
            t: 'Data cleaning is most of the job',
            say: 'Expect to spend most of your time finding, cleaning and shaping data. Modelling is a small slice at the end.',
            why: 'Courses show the clean CSV. Real work does not, and the shock derails people in their first job.',
            analogy: 'Cooking is mostly shopping, washing and chopping. The actual cooking is ten minutes.',
            demo: 'Show a deliberately messy CSV: missing ages, "N/A" and blank and NULL in one column, dates in three formats, duplicate rows.',
            ask: [
              ['What do I do with missing values?', 'Drop the rows, drop the column, or fill with median or mode — depending on how much is missing and whether it is missing for a reason.'],
              ['Is missing data random?', 'Often not, and that is the interesting part. People who skip the income field may differ systematically.'],
            ],
            depth: 'Missing values, duplicates, inconsistent formats. Skip outlier theory.',
          },
          {
            t: 'Scaling and encoding',
            say: 'Models see numbers, so text categories must become numbers and different scales must be brought into line.',
            why: 'Forgetting to scale silently wrecks distance-based models, and it is invisible in the error messages.',
            analogy: 'Comparing salary in rupees with age in years — the salary column shouts and the age column is inaudible.',
            demo: 'Salary 25,000–200,000 next to age 20–60. Run kNN mentally and show that age contributes almost nothing until you scale.',
            ask: [
              ['Which models need scaling?', 'Distance and gradient based — kNN, SVM, neural networks, k-means. Trees do not care.'],
              ['One-hot or label encoding?', 'One-hot for unordered categories like city. Label encoding implies an order, which is fine for small/medium/large and wrong for city names.'],
            ],
            depth: 'Fit the scaler on training data only. Say it twice — fitting on everything leaks test information.',
          },
          {
            t: 'From notebook to something people use',
            say: 'A model in a notebook helps nobody. Wrap it in an API, put a page in front, and deploy it.',
            why: 'It is the gap between a course certificate and a portfolio that gets interviews.',
            analogy: 'A recipe written down versus a restaurant that serves it.',
            demo: 'Architecture on the board: save the model → small FastAPI or Flask endpoint → simple frontend → deploy. Four boxes.',
            ask: [
              ['How do I save a model?', 'pickle or joblib for scikit-learn. Save the scaler and encoders too — forgetting them is the classic deployment bug.'],
              ['Where do I host it?', 'Render, Railway or a small cloud VM. A free tier is plenty for a portfolio project.'],
            ],
            depth: 'One deployed model beats five notebooks. Say it plainly.',
          },
          {
            t: 'Models rot: drift and monitoring',
            say: 'The world changes and a model trained on last year quietly gets worse. Nothing errors — it just decays.',
            why: 'Nearly never taught, and it is a strong signal of maturity in an interview.',
            analogy: 'A map of a city that keeps building new roads. Still readable, increasingly wrong.',
            demo: 'A footfall model trained before the pandemic, run during it. No crash, no error — just confidently wrong numbers.',
            ask: [
              ['How do I detect it?', 'Track prediction distributions and real outcomes over time. A shift in either is the warning.'],
              ['How often do I retrain?', 'When performance drops below a threshold you set in advance, not on a calendar out of habit.'],
            ],
            depth: 'The concept and one example. MLOps tooling is a different course.',
          },
        ],
      },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════ */
  {
    id: 'ai',
    title: 'AI & Large Language Models',
    blurb: 'What sits on top of machine learning: how LLMs actually work, how to build with them, and where the jobs really are.',
    sessions: [
      {
        id: 'ai-1',
        title: 'What AI is, and what it is not',
        mins: 60,
        goal: 'Clean vocabulary, and realistic expectations about what today\'s systems can do.',
        topics: [
          {
            t: 'AI vs ML vs deep learning vs generative AI',
            say: 'AI is the goal, machine learning is the main method, deep learning is one very successful kind of ML, and generative AI is what deep learning became good at recently.',
            why: 'Students use all four interchangeably and it immediately marks them as surface-level in an interview.',
            analogy: 'AI is "transport". ML is "engines". Deep learning is "jet engines". Generative AI is "passenger jets" — one wildly successful application.',
            demo: 'Four nested circles on the board. Rule-based chess in the outer, spam filters next, image recognition next, ChatGPT in the centre.',
            ask: [
              ['Is all AI machine learning?', 'No. Old chess engines and rule-based expert systems are AI with no learning at all — a human wrote every rule.'],
              ['Why did deep learning suddenly work?', 'Three things arrived together around 2012: cheap GPUs, huge labelled datasets, and better training techniques. None alone was enough.'],
            ],
            depth: 'Boundaries and names. The mechanism comes next session.',
          },
          {
            t: 'Narrow AI, and why AGI talk is noise for now',
            say: 'Everything deployed today does one class of task. Nothing in production has general understanding.',
            why: 'They are marinated in headlines and need a calibrated view to reason and interview sensibly.',
            analogy: 'A calculator beats you at arithmetic and cannot tie a shoelace. Extreme skill in a narrow band is not general ability.',
            demo: 'A model that writes working code and then fails a simple counting question. Competence is jagged, not a single level.',
            ask: [
              ['Is AGI close?', 'Genuine expert disagreement, with estimates spanning decades. Anyone certain in either direction is overselling. Say that honestly.'],
              ['Should I be worried about my career?', 'The routine parts are being automated. Judgement, debugging, system design and knowing what to build are rising in value.'],
            ],
            depth: 'Stay calibrated. Do not sell either fear or hype.',
          },
        ],
      },
      {
        id: 'ai-2',
        title: 'Inside a large language model',
        mins: 90,
        goal: 'They can explain next-token prediction and why hallucination is structural, not a bug to be patched.',
        topics: [
          {
            t: 'Next-token prediction',
            say: 'A language model does exactly one thing: given the text so far, guess the next chunk. Everything else is that, repeated.',
            why: 'Every misconception about AI dissolves once this lands. It reframes the whole field in one sentence.',
            analogy: 'Phone keyboard autocomplete, trained on a very large fraction of the internet instead of your messages.',
            demo: 'Type half a sentence and have the class shout the next word. Note that they disagree — the model also holds a spread of probabilities.',
            ask: [
              ['Then how does it answer questions?', 'Because in its training data the most likely continuation of a question was an answer. It is imitating the shape of answers.'],
              ['Does it understand?', 'It captures structure and relationships extremely well, and there is real disagreement about whether that counts. Do not overclaim either way.'],
            ],
            depth: 'Tokens as "word pieces". No byte-pair encoding detail.',
          },
          {
            t: 'Embeddings — meaning as coordinates',
            say: 'Words and sentences become long lists of numbers, arranged so that similar meanings sit close together.',
            why: 'It is the foundation of search, recommendations and RAG — arguably more useful to them than the LLM itself.',
            analogy: 'A map where Delhi and Mumbai are far apart, but "doctor" and "physician" are neighbours.',
            demo: 'The classic: king − man + woman lands near queen. Arithmetic on meaning surprises every room.',
            ask: [
              ['How many numbers?', 'Hundreds to a few thousand per item. Each dimension has no human name; the geometry is what matters.'],
              ['Where would I use this?', 'Semantic search — finding documents that mean the same thing rather than sharing keywords.'],
            ],
            depth: 'Geometry intuition. No cosine similarity formula.',
          },
          {
            t: 'Transformers and attention',
            say: 'When processing a word, the model weighs how much every other word in the input matters to it.',
            why: 'It is the architecture behind everything since 2017, and they will be asked what a transformer is.',
            analogy: 'Reading "the animal did not cross the road because it was too tired" — you instantly know "it" means the animal. Attention is that, learned.',
            demo: 'Write that sentence and draw arrows from "it" to "animal", thick, and to "road", thin. That is an attention weight.',
            ask: [
              ['Why was this better than what came before?', 'Older models read strictly left to right and forgot long-range context. Attention sees everything at once and parallelises on GPUs.'],
              ['What does the "T" in GPT stand for?', 'Transformer. Generative Pre-trained Transformer — all three words now mean something to you.'],
            ],
            depth: 'One attention arrow diagram. No queries, keys and values today.',
          },
          {
            t: 'Context window, and why it forgets',
            say: 'There is a hard limit on how much text it can consider at once. Past that, the earliest parts fall out of view.',
            why: 'Explains a whole class of confusing behaviour they will hit within a week of building anything.',
            analogy: 'A desk that fits forty pages. Page forty-one arrives and page one goes on the floor.',
            demo: 'A long conversation where an instruction from the start is quietly ignored later. Then restate it and watch compliance return.',
            ask: [
              ['Do bigger windows fix it?', 'They help, but attention quality degrades across very long inputs and cost rises. Bigger is not free.'],
              ['How do I work around it?', 'Summarise older turns, or retrieve only the relevant parts — which is exactly what RAG does.'],
            ],
            depth: 'Enough that they can debug "why did it forget". No positional encoding.',
          },
          {
            t: 'Why hallucination is structural',
            say: 'It always produces the most plausible continuation. Plausible and true are different, and it cannot tell them apart.',
            why: 'Students trust output blindly. This is the single most damaging habit in their projects.',
            analogy: 'A confident classmate who never says "I do not know" — fluent, persuasive, occasionally entirely wrong.',
            demo: 'Ask a model for citations on a niche topic and check them live. Some will not exist. This lands harder than any explanation.',
            ask: [
              ['Can it be fixed?', 'Reduced, not removed. Grounding it in real documents and asking for sources helps a lot. Verification remains your job.'],
              ['Why does it sound so certain?', 'Confident text was more common in its training data than hedging. Tone is imitated, not earned.'],
            ],
            depth: 'Name RAG as the mitigation; next session covers it.',
          },
        ],
      },
      {
        id: 'ai-3',
        title: 'Building with LLMs',
        mins: 90,
        goal: 'They leave able to build a grounded AI feature, not just chat with one.',
        topics: [
          {
            t: 'Prompting that actually works',
            say: 'Give it a role, the context, the task, and the output format. Vague in, vague out.',
            why: 'The highest-leverage skill in the room, usable from tomorrow morning.',
            analogy: 'Briefing a new intern. "Make it better" gets you nothing; a clear brief gets you work you can use.',
            demo: 'Same task, two prompts, side by side. Run the lazy one first so the improvement is undeniable.',
            ask: [
              ['Is prompt engineering a real job?', 'As a standalone title it is fading. As a skill inside engineering roles it is now assumed, like knowing how to search well.'],
              ['What is few-shot prompting?', 'Showing two or three worked examples in the prompt. Often beats a paragraph of instructions.'],
            ],
            depth: 'Role, context, task, format, plus few-shot. Skip exotic techniques.',
          },
          {
            t: 'RAG — giving a model your own data',
            say: 'Retrieve the relevant chunks from your documents, paste them into the prompt, then ask the question.',
            why: 'The most common real AI system in industry and a genuinely impressive student project.',
            analogy: 'An open-book exam. The model is not smarter, it just has the right page open.',
            demo: 'On the board: documents → chunks → embeddings → vector store → retrieve top k → prompt → answer. Seven boxes and they can build it.',
            ask: [
              ['Is this fine-tuning?', 'No, and confusing them is a common interview trip. RAG changes what the model sees; fine-tuning changes the model itself.'],
              ['Why chunk the documents?', 'Whole documents blow the context window and dilute relevance. Chunks let you retrieve only what matters.'],
            ],
            depth: 'Draw the pipeline. Chunking strategy is a detail for later.',
          },
          {
            t: 'Fine-tuning — when it is actually right',
            say: 'Continue training an existing model on your own examples, to change how it behaves rather than what it knows.',
            why: 'Students reach for fine-tuning first when RAG is almost always the correct answer. Costly mistake.',
            analogy: 'RAG is handing someone a reference book. Fine-tuning is sending them on a course to change how they work.',
            demo: 'Two columns: "facts that change" → RAG. "Consistent style, format or a narrow repeated task" → fine-tune.',
            ask: [
              ['Can I fine-tune facts in?', 'Badly. They become hard to update and easy to hallucinate around. Facts belong in retrieval.'],
              ['How much data do I need?', 'Hundreds of good examples beat thousands of sloppy ones. Quality dominates.'],
            ],
            depth: 'The decision rule matters more than the procedure.',
          },
          {
            t: 'Agents and tool use',
            say: 'Let the model call real functions — search, a database, an API — and decide the order itself.',
            why: 'Where the field is heading, and the framing behind most current AI product work.',
            analogy: 'An assistant who can pick up the phone and look things up, instead of only answering from memory.',
            demo: 'A booking assistant: check availability (database), take payment (API), send confirmation (email). The model chooses the sequence.',
            ask: [
              ['Is it reliable?', 'Improving, still brittle for long chains. Keep the steps few and verify anything that costs money or sends mail.'],
              ['Do I need a framework?', 'Not to begin. Understand the loop — model requests a tool, you run it, you feed the result back — then pick tooling.'],
            ],
            depth: 'The loop, and a warning about acting without verification.',
          },
        ],
      },
      {
        id: 'ai-4',
        title: 'Projects, jobs and limits',
        mins: 90,
        goal: 'They leave with a project they can start this week and a realistic view of AI hiring.',
        topics: [
          {
            t: 'Projects that get noticed',
            say: 'Solve a problem you personally have, with real data, and deploy it where someone else can click it.',
            why: 'Every fresher CV carries the same Titanic notebook. At this level, specific beats sophisticated.',
            analogy: 'A cooked meal someone ate beats a photo of your ingredients.',
            demo: 'Contrast two CV lines: "Built an ML model (Kaggle)" versus "Built a tool that reads my college notice PDFs and answers questions — 60 classmates use it".',
            ask: [
              ['Will they care that I used an API?', 'They care that it works, that people use it, and that you can explain the tradeoffs. Building from scratch is not the bar.'],
              ['How big should it be?', 'Small and finished beats ambitious and abandoned. Ship in two weeks, then improve.'],
            ],
            depth: 'Have three or four concrete ideas ready, each sized to a fortnight.',
          },
          {
            t: 'The honest state of AI jobs',
            say: 'Very few freshers are hired to train models. Most build products that use them.',
            why: 'They are being sold a fantasy of research roles and will aim at the wrong target for a year.',
            analogy: 'Few people design engines. Very many build cars, and that is where the jobs are.',
            demo: 'Open three real fresher job posts and read the requirements aloud. Count how many say Python, APIs and SQL rather than research.',
            ask: [
              ['Do I need an MTech or PhD?', 'For research roles usually yes. For the large majority of AI engineering jobs, no.'],
              ['What should I learn first?', 'Python, one web framework, SQL, git, and how to call and evaluate an API. That combination is hireable.'],
            ],
            depth: 'Concrete and current. Do not speculate ten years out.',
          },
          {
            t: 'Bias, privacy and the things that get people fired',
            say: 'A model trained on past decisions will reproduce the bias in those decisions, confidently and at scale.',
            why: 'Increasingly asked in interviews, and it is the part that causes real harm.',
            analogy: 'A hiring model trained on who was hired before learns who used to get hired, not who is good.',
            demo: 'Amazon scrapped an internal hiring tool that penalised CVs mentioning women\'s activities — learned from ten years of past CVs.',
            ask: [
              ['How do I check for bias?', 'Measure performance separately across groups. An overall number can hide a model that fails badly for one of them.'],
              ['Can I put customer data into ChatGPT?', 'Check the policy and your contract first. Freely pasting personal data into a third-party API is how people lose jobs.'],
            ],
            depth: 'One real case and one practical check. Do not moralise.',
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
    id: 'ai-ml',
    title: 'Four weekends — AI and ML in depth',
    note: 'For a cohort that came specifically for AI. Saturday is the group session; Sunday is 1:1 on whatever that student is stuck on.',
    weeks: [
      { week: 1, title: 'How machines learn', sessions: ['ml-1', 'ml-2'],
        note: 'Foundations first. Resist jumping to ChatGPT — the rest only makes sense on top of this.' },
      { week: 2, title: 'Judging and shipping a model', sessions: ['ml-3', 'ml-4'],
        note: 'The accuracy-lies session changes how they think. End with one model actually deployed.' },
      { week: 3, title: 'Inside LLMs', sessions: ['ai-1', 'ai-2'],
        note: 'Now the magic has a mechanism. They should leave able to explain an LLM to a friend.' },
      { week: 4, title: 'Building with AI', sessions: ['ai-3', 'ai-4'],
        note: 'RAG is the project. Close on jobs and limits so they leave with direction, not just knowledge.' },
    ],
  },
  {
    id: 'broad',
    title: 'Four weekends — the broad survey',
    note: 'For a mixed cohort that wants the whole landscape rather than depth in one area.',
    weeks: [
      { week: 1, title: 'Machine learning, condensed', sessions: ['ml-1', 'ml-3'],
        note: 'How learning works, then straight to evaluation. Skip the algorithm tour for this cohort.' },
      { week: 2, title: 'AI and LLMs', sessions: ['ai-1', 'ai-2', 'ai-3'],
        note: 'Long day. Cut the agents topic if you are running behind.' },
      { week: 3, title: 'Blockchain and security', sessions: ['bc-1', 'bc-2', 'em-2'],
        note: 'Blockchain satisfies curiosity; security is the part that changes how they write code.' },
      { week: 4, title: 'Shipping and marketing', sessions: ['em-1', 'mk-1', 'mk-2'],
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
