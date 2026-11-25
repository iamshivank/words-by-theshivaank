-- Sample content so the design can be judged on first run. Delete any of it from /desk/admin (Content).
INSERT INTO tags (name, slug) VALUES
    ('Writing', 'writing'), ('Decisions', 'decisions'), ('Attention', 'attention'), ('Habits', 'habits');

INSERT INTO entries (type, title, slug, content_html, excerpt, visibility, status, published_at, highlight_label, featured, entry_date)
VALUES
('essay', 'The discipline of small pages', 'the-discipline-of-small-pages',
$h$<p>For years I believed that writing happened in large rooms of time. A free Sunday, a long flight, the week between jobs. I waited for those rooms the way some people wait for weather, and when they came I usually spent them tidying the desk, rereading old notes, and feeling vaguely guilty that the great work had still not begun.</p>
<p>What finally changed my writing was not a large room. It was a small page.</p>
<h2>The arithmetic of a paragraph</h2>
<p>Three hundred words a day does not sound like much. It is roughly a page, the length of a long email you would not think twice about sending. But three hundred words a day is a hundred thousand words a year, which is a book, or twenty essays, or a year of honest record of what you thought while it was happening.</p>
<p>The arithmetic is not the point, though. The point is what a small, daily page does to the fear. When the page is small, there is no room for the performance of writing. There is only the next sentence. You cannot spend an hour choosing a font for three hundred words.</p>
<blockquote><p>The page does not need to be good. It needs to be there tomorrow, waiting to be made better.</p></blockquote>
<h2>Showing up is a skill</h2>
<p>We tend to treat consistency as a matter of character, something you either have or lack. I have come to think of it as a skill, and like any skill it is made of small, learnable parts: a fixed time, a fixed place, a ritual that tells the mind the work has started, and a rule that a bad page still counts.</p>
<p>That last rule matters most. Most streaks do not end because we run out of time. They end because we sit down, write something poor, and decide that it does not deserve to count. The discipline of small pages is mostly the discipline of forgiving yourself quickly.</p>
<h2>What accumulates</h2>
<p>After a few months, something strange happens. The pages begin to talk to each other. A worry from March turns out to be the first draft of a decision in June. A sentence you wrote half asleep becomes the opening of an essay you are proud of. You discover that you have been thinking about the same three questions for years, and that writing them down every day has quietly been answering them.</p>
<p>None of this requires a large room. It requires a chair, a small page, and the willingness to fill it badly, again, tomorrow.</p>$h$,
'Writing changed for me not when I found more time, but when I made the page smaller.',
'public', 'published', now() - interval '2 days', 'Fresh ink', true, (now() - interval '2 days')::date),

('essay', 'Deciding slowly', 'deciding-slowly',
$h$<p>Most of the decisions I regret were not made badly. They were made quickly, in the half-light of a mood, and then defended for months because changing my mind felt like admitting the mood had been in charge.</p>
<p>So I started keeping a decision journal. It is not complicated. Before any choice that will matter in six months, I write down what I am deciding, the options I actually considered, what I expect to happen, and how confident I am, as a number. Then I set a date to look again.</p>
<h2>Process and outcome are different things</h2>
<p>The most useful thing the journal taught me is that a good decision can have a bad outcome, and a bad decision can get lucky. Poker players know this in their bones. The rest of us tend to judge our choices entirely by how they turned out, which teaches us exactly the wrong lessons.</p>
<blockquote><p>A decision is a bet made with the information you had. Judge the bet, not the dice.</p></blockquote>
<p>When the review date arrives, I ask two separate questions. Was the reasoning sound, given what I knew? And how did it actually go? Writing both answers down, side by side, has done more for my judgment than any book on decision-making.</p>
<h2>The confidence number</h2>
<p>The number is the uncomfortable part. Writing "80%" next to a prediction feels presumptuous. But after a year of these entries, a pattern appears: the things I was 90% sure about came true about two thirds of the time. I was not as calibrated as I felt. Now, when I catch myself feeling certain, I treat the feeling as information about my mood rather than about the world.</p>
<h2>Slowness as a tool</h2>
<p>Deciding slowly does not mean deciding late. It means giving the decision one honest page before you commit to it. Most of the time, the page confirms what you already wanted. Occasionally, it shows you that you were about to choose the option that was easiest to explain rather than the one that was right. Those occasions pay for all the rest.</p>$h$,
'A decision journal taught me to separate the quality of a choice from the luck of its outcome.',
'public', 'published', now() - interval '9 days', 'Editor''s pick', true, (now() - interval '9 days')::date),

('essay', 'What the morning knows', 'what-the-morning-knows',
$h$<p>There is an hour, just after waking and just before the phone, when the mind is still mostly your own. It has not yet been told what to worry about. It has not yet compared itself to anyone. It is quiet in a way it will not be again until night.</p>
<p>For a long time I gave that hour away without noticing. The alarm became a notification, the notification became a feed, and by the time I had brushed my teeth I was already living inside other people's urgencies.</p>
<h2>An experiment</h2>
<p>I tried something simple: the first thing I would read each morning would be something I had written. Not email, not news. Just a page. Sometimes yesterday's journal entry, sometimes a blank page waiting to be filled.</p>
<p>The effect was not dramatic. It was something better than dramatic: it was steady. Starting the day with my own sentences, however clumsy, reminded me that I had a point of view before the world offered me one.</p>
<blockquote><p>Attention is the only thing we truly spend. The morning is where we decide what it is for.</p></blockquote>
<h2>What it knows</h2>
<p>The morning knows things the afternoon forgets. It knows which worry is real and which was only tiredness. It knows which project you actually care about, because that is the one your mind drifts toward before anyone asks. It knows, very often, the sentence you were stuck on last night.</p>
<p>I do not think everyone needs to write in the morning. But I think everyone deserves one hour a day that begins with their own thoughts. For me, it turned out, the morning was simply where that hour had been hiding.</p>$h$,
'An hour that begins with your own sentences, before the world offers you its own.',
'public', 'published', now() - interval '23 days', NULL, false, (now() - interval '23 days')::date);

INSERT INTO entry_tags (entry_id, tag_id)
SELECT e.id, t.id FROM entries e JOIN tags t ON
    (e.slug = 'the-discipline-of-small-pages' AND t.slug IN ('writing', 'habits')) OR
    (e.slug = 'deciding-slowly' AND t.slug = 'decisions') OR
    (e.slug = 'what-the-morning-knows' AND t.slug IN ('attention', 'habits'));

INSERT INTO entries (type, title, content_html, visibility, status, entry_date, mood, energy, gratitude, lessons) VALUES
('journal', 'A slow start, a good finish',
$h$<p>Woke up later than planned and spent the first hour feeling behind. Wrote anyway, mostly about why I felt behind. Turned out it was not the late start; it was the unanswered message from Friday that I had been carrying all weekend.</p><p>Answered it before lunch. It took four minutes. The rest of the day was lighter than it had any right to be.</p>$h$,
'private', 'published', (now() - interval '1 day')::date, 4, 3,
'The friend who replied within a minute and made it easy.',
'The heavy thing is usually smaller than the weight of avoiding it.'),
('journal', 'Notes after the long walk',
$h$<p>Walked for an hour without headphones. The first twenty minutes were noise: lists, replays of conversations, small irritations. Somewhere after the bridge it went quiet and the essay I have been stuck on rearranged itself. The ending is the beginning. Of course it is.</p>$h$,
'private', 'published', (now() - interval '3 days')::date, 5, 4,
'Cold air, an empty path, an idea arriving on its own.',
'Boredom is where the good thoughts wait for me.'),
('journal', 'Tired, honest',
$h$<p>Not much to say today. Tired, a little flat. Wrote three sentences and decided that counts. Tomorrow: sleep earlier, phone in the other room.</p>$h$,
'private', 'published', (now() - interval '4 days')::date, 2, 2, NULL,
'A short entry is still an entry.'),
('note', 'Essay idea',
$h$<p>The things we photograph versus the things we write down. Which one do we remember?</p>$h$,
'private', 'draft', (now() - interval '5 days')::date, NULL, NULL, NULL, NULL);

-- Plain text, word counts and reading time, as the app computes them on save.
UPDATE entries SET content_text = trim(regexp_replace(regexp_replace(content_html, '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g'));
UPDATE entries SET word_count = coalesce(array_length(regexp_split_to_array(nullif(content_text, ''), '\s+'), 1), 0);
UPDATE entries SET reading_time_minutes = greatest(1, ceil(word_count / 230.0)::int);
