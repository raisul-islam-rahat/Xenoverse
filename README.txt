SPEAK//OS — IELTS SPEAKING WEBSITE SKELETON

WHAT IS INCLUDED
- index.html: futuristic topic dashboard
- topic.html: one reusable question-and-answer renderer for every topic
- assets/site.css: shared Calibri, Material, dark/light visual system
- assets/theme.js: persistent dark/light theme switcher
- assets/index.js: reads topics/topics.txt and creates the index cards
- assets/topic.js: reads the selected topic .txt file and creates Q&A cards
- topics/topics.txt: manifest controlling every card shown on the index
- topics/hometown.txt: three sample entries for testing Topic 01
- topics/personal-details.txt: sample using the discussed format
- topics/TEMPLATE.txt: safe template to copy for a new topic file

FOLDER STRUCTURE
index.html
topic.html
assets/
  site.css
  theme.js
  index.js
  topic.js
topics/
  topics.txt
  TEMPLATE.txt
  hometown.txt
  personal-details.txt
  ...future topic files...

HOW THE INDEX WORKS
The index reads one line per topic from topics/topics.txt:

01|Hometown|hometown|Personal

Field 1 = display number
Field 2 = card title
Field 3 = .txt filename without the extension
Field 4 = filter category

The example above opens:
topic.html?topic=hometown

The reusable topic page then loads:
topics/hometown.txt

HOW TO WRITE A TOPIC FILE
Question: Write the question here.
Answer: Write the answer here. Answers may contain multiple lines.

---

Question: Write the next question here.
Answer: Write the next answer here.

RULES
1. Begin every entry with Question:
2. Put Answer: on a new line.
3. Put --- on its own line between entries.
4. Save the filename exactly as the slug in topics.txt plus .txt.
5. The page automatically displays every valid pair in the file.
6. Malformed blocks are skipped and reported in the page status.

PROGRESS AND THEMES
- Clicking a topic card increments that topic's launch counter.
- Opening an answer increments that question's reveal counter.
- Question keys are based on their text, so adding a new question does not shift existing progress.
- Theme choice and progress are saved in browser localStorage.
- Progress remains local to that browser and does not synchronize between devices.

IMPORTANT: RUN THROUGH A WEB SERVER
Modern browsers commonly block fetch() when index.html is opened directly through file://.
Host the folder on GitHub Pages, or use a local web server such as VS Code Live Server.
Do not change the internal folder structure when uploading to GitHub Pages.
