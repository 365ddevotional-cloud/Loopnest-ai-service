import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import ts from "typescript";
import scope from "../locales/stage-two-scope.json";

const languages = ["en", "es", "fr", "yo", "pcm", "ha"];
const locales = Object.fromEntries(languages.map(lang => [lang, JSON.parse(fs.readFileSync(`client/src/locales/${lang}.json`, "utf8"))]));
const bySource = new Map<string,string[]>();
for (const [key,value] of Object.entries(locales.en)) bySource.set(value as string,[...(bySource.get(value as string)||[]),key]);
function tree(file:string,source=fs.readFileSync(file,"utf8")) { return ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS); }
function visit(node:ts.Node,callback:(node:ts.Node)=>void) { callback(node);ts.forEachChild(node,child=>visit(child,callback)); }
function assertTranslations(key:string) {
  for (const lang of languages) {
    assert.ok(typeof locales[lang][key]==="string" && locales[lang][key].trim(),`${lang}.${key} missing`);
    assert.deepEqual((locales[lang][key].match(/\{\w+\}/g)||[]).sort(),(locales.en[key].match(/\{\w+\}/g)||[]).sort(),`${lang}.${key} placeholders`);
  }
}

test("all statically referenced Stage 2 labels are bundled in all six languages",()=>{
  let references=0;
  for(const file of scope) {
    const source=tree(file);
    visit(source,node=>{
      if(!ts.isCallExpression(node)||!node.arguments[0]||!ts.isStringLiteral(node.arguments[0]))return;
      const call=node.expression.getText(source),arg=node.arguments[0].text;
      if(call==="t") {assertTranslations(arg);references++;}
      if(call==="tx") {const keys=bySource.get(arg);assert.ok(keys?.length,`${file}: ${arg}`);keys.forEach(assertTranslations);references++;}
    });
  }
  assert.ok(references>1200);
});

test("translated display text never changes machine attributes or routes",()=>{
  const attrs=new Set(["value","defaultValue","type","name","href","src","variant","className","data-testid","aria-current"]);
  for(const file of scope.filter(file=>file.endsWith(".tsx"))) {
    const ast=tree(file);
    visit(ast,node=>{
      if(ts.isJsxAttribute(node)&&attrs.has(node.name.getText(ast)))
        assert.ok(!/\b(?:tx|translateAppText|translateEnumLabel)\(/.test(node.getText(ast)),`${file}: ${node.name.getText(ast)}`);
    });
  }
});

test("copyrighted and private content is not routed through interface translation",()=>{
  for(const file of scope) {
    const ast=tree(file);
    visit(ast,node=>{
      if(ts.isCallExpression(node)&&node.expression.getText(ast)==="tx"&&node.arguments[0]) {
        const arg=node.arguments[0].getText(ast);
        assert.ok(!/^(song\.(lyrics|title)|product\.(title|description|previewText)|m\.message|msg\.message|section\.body|book\.paragraphs)/.test(arg),`${file}: content translated`);
      }
    });
  }
  assert.ok(fs.readFileSync("client/src/pages/QuickPrayer.tsx","utf8").includes('"For where two or three gather in my name, there am I with them." — Matthew 18:20'));
  assert.ok(fs.readFileSync("server/translationService.ts","utf8").includes("createSavedTranslationReader"));
  assert.ok(!fs.readFileSync("server/translationService.ts","utf8").includes("OpenAI"));
});
