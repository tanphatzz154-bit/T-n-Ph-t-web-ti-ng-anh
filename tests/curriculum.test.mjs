import test from 'node:test';
import assert from 'node:assert/strict';
import {weeks} from '../docs/curriculum.js';
test('four complete weeks contain valid vocabulary, grammar answers and shadowing for every day',()=>{
  assert.equal(weeks.length,4);
  const ids=new Set();
  for(const [wi,week] of weeks.entries()){
    assert.equal(week.id,wi+1);assert.equal(week.days.length,7);
    for(const [di,day] of week.days.entries()){
      assert.equal(day.id,`w${wi+1}d${di+1}`);assert.ok(!ids.has(day.id));ids.add(day.id);
      assert.ok(day.title&&day.goal);assert.ok(day.words.length>=3);
      for(const w of day.words)for(const key of ['en','vi','example','translation'])assert.ok(typeof w[key]==='string'&&w[key].trim(),`${day.id} word ${key}`);
      assert.equal(day.grammar.questions.length,3);
      for(const q of day.grammar.questions){
        assert.ok(q.prompt&&q.explanation);
        if(q.type==='fill'){
          assert.ok(q.prompt.includes('___'),`${day.id}: fill-in question needs a visible blank`);
          assert.ok(Array.isArray(q.answers)&&q.answers.length>0,`${day.id}: fill-in question needs accepted answers`);
          assert.ok(q.answers.every(answer=>typeof answer==='string'&&answer.trim()),`${day.id}: accepted answers must be nonempty text`);
          assert.equal(q.options,undefined);
        }else{
          assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);
        }
      }
      assert.ok(day.shadow.lines.length>=4&&day.shadow.lines.length<=6);
      for(const line of day.shadow.lines)assert.ok(line.en&&line.vi);
      assert.ok(day.shadow.prompt&&day.shadow.hint&&day.shadow.stretch);
    }
  }
  assert.equal(ids.size,28);
});

test('weekly review and challenge questions require fresh recall instead of repeating earlier answers',()=>{
  const seen=new Set();
  let fillCount=0;
  for(const week of weeks){
    for(const [index,day] of week.days.entries()){
      for(const q of day.grammar.questions){
        assert.ok(!seen.has(q.prompt),`${day.id}: repeated question prompt`);
        seen.add(q.prompt);
      }
      if(index>=5){
        assert.equal(day.grammar.questions.filter(q=>q.type==='fill').length,1,`${day.id}: include one typed recall question`);
        assert.equal(day.grammar.questions.filter(q=>q.type!=='fill').length,2);
        fillCount++;
      }
    }
  }
  assert.equal(fillCount,8);
  assert.equal(seen.size,84);
});

test('each end-of-week lesson has a concrete writing task and self-review guidance',()=>{
  for(const week of weeks){
    const earlierGrammar=new Set(week.days.slice(0,5).map(day=>day.grammar));
    for(const day of week.days.slice(5)){
      assert.ok(!earlierGrammar.has(day.grammar),`${day.id}: review must not modify an earlier grammar lesson`);
      const writing=day.grammar.writing;
      assert.ok(writing&&writing.prompt&&writing.sampleAnswer,`${day.id}: writing needs a prompt and sample`);
      assert.ok(writing.prompt.startsWith('Viết')||writing.prompt.startsWith('Không chép'),`${day.id}: explicitly invite the learner to write`);
      assert.equal(writing.checklist.length,3);
      assert.ok(writing.checklist.every(item=>typeof item==='string'&&item.trim()));
      assert.equal(new Set(writing.checklist).size,3);
    }
    for(const day of week.days.slice(0,5))assert.equal(day.grammar.writing,undefined);
  }
});
