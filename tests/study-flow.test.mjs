import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseStudyStart,isCorrectAnswer} from '../docs/study-flow.js';

test('start prioritizes due review unless resuming or consciously continuing after review',()=>{
  assert.equal(chooseStudyStart({hasDue:true,parts:{}}),'review');
  assert.equal(chooseStudyStart({hasDue:true,resumePage:'grammar'}),'grammar');
  assert.equal(chooseStudyStart({hasDue:true,reviewDoneToday:true,parts:{}}),'vocab');
  assert.equal(chooseStudyStart({hasDue:false,parts:{vocab:true}}),'grammar');
  assert.equal(chooseStudyStart({hasDue:false,parts:{vocab:true,grammar:true}}),'shadow');
});

test('fill answers accept harmless typography but not different grammar or empty submissions',()=>{
  const q={type:'fill',answers:["I'd like"]};
  assert.equal(isCorrectAnswer(q,'  I’d   LIKE! '),true);
  assert.equal(isCorrectAnswer(q,'I like'),false);
  assert.equal(isCorrectAnswer(q,''),false);
  assert.equal(isCorrectAnswer(q,null),false);
  assert.equal(isCorrectAnswer({answer:1},1),true);
  assert.equal(isCorrectAnswer({answer:1},'1'),false);
});
