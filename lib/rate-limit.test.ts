// Rate limiter unit tests (memory + Upstash mock)
import { checkRateLimit, checkRateLimitMemory, checkRateLimitUpstash, getClientIp, _resetMemoryStore } from "./rate-limit";
const origFetch = globalThis.fetch;
let passed = 0, failed = 0;
const a = (c,m) => { if(c) { passed++; console.log("  PASS:",m); } else { failed++; console.log("  FAIL:",m); } };

(async () => {

// Suite 1: Memory backend
_resetMemoryStore();
const k1 = "m1_" + Date.now();
a(checkRateLimitMemory(k1,10,60000).allowed===true, "mem: first allowed");
a(checkRateLimitMemory(k1,10,60000).remaining===8, "mem: remaining=8");
for(let i=0;i<8;i++) checkRateLimitMemory(k1,10,60000);
const r1 = checkRateLimitMemory(k1,10,60000);
a(r1.allowed===false, "mem: 11th blocked");
a(r1.remaining===0, "mem: remaining=0");
a(r1.retryAfter>0, "mem: retryAfter>0");

// Suite 2: Independent keys
_resetMemoryStore();
const k2a = "ia_" + Date.now(), k2b = "ib_" + Date.now();
checkRateLimitMemory(k2a,5,60000); checkRateLimitMemory(k2a,5,60000);
a(checkRateLimitMemory(k2a,5,60000).remaining===2, "keys: A independent");
a(checkRateLimitMemory(k2b,5,60000).remaining===4, "keys: B independent");

// Suite 3: getClientIp
const mr1 = new Request("http://x",{headers:{"x-forwarded-for":"1.2.3.4,5.6.7.8"}});
a(getClientIp(mr1)==="1.2.3.4", "cip: x-forwarded-for");
const mr2 = new Request("http://x",{headers:{"x-real-ip":"9.9.9.9"}});
a(getClientIp(mr2)==="9.9.9.9", "cip: x-real-ip");
const mr3 = new Request("http://x");
a(getClientIp(mr3)==="unknown", "cip: unknown");

// Suite 4: Upstash backend (mocked)
let fc = 0;
globalThis.fetch = async (url,init) => {
  fc++;
  const b = init?.body ? JSON.parse(init.body) : null;
  if (Array.isArray(b) && Array.isArray(b[0])) {
    const r = b.map(cmd => {
      if (cmd[0]==="ZREMRANGEBYSCORE") return {result:0};
      if (cmd[0]==="ZCARD") return {result:3};
      if (cmd[0]==="ZADD") return {result:1};
      if (cmd[0]==="EXPIRE") return {result:1};
      return {result:null};
    });
    return new Response(JSON.stringify(r),{status:200});
  }
  return new Response("{}",{status:200});
};
const ku = "up_" + Date.now();
const ru = await checkRateLimitUpstash(ku,10,60000);
a(ru.allowed===true, "upstash: allowed");
a(ru.remaining===6, "upstash: remaining=6 (10-3-1)");
a(fc>=2, "upstash: >=2 fetch calls");

// Suite 5: Upstash blocked
fc = 0;
globalThis.fetch = async () => {
  fc++;
  return new Response(JSON.stringify([{result:0},{result:15}]),{status:200});
};
const ru2 = await checkRateLimitUpstash(ku,10,60000);
a(ru2.allowed===false, "upstash: blocked at 15");
a(ru2.remaining===0, "upstash: rem=0");
a(ru2.retryAfter>0, "upstash: retryAfter>0");
a(fc===1, "upstash: 1 fetch (no ZADD)");

// Suite 6: Upstash error fallback
globalThis.fetch = async () => { throw new Error("sim"); };
try { await checkRateLimitUpstash("fk",10,60000); a(false,"upstash: should throw"); } catch { a(true,"upstash: throws"); }
_resetMemoryStore();
const rf = await checkRateLimit("ft",5,60000);
a(rf.allowed===true, "fallback: public func works");
a(rf.remaining===4, "fallback: memory backend");

// Suite 7: Thresholds
_resetMemoryStore();
const fbk = "tf_" + Date.now();
for(let i=0;i<30;i++) a(checkRateLimitMemory(fbk,30,60000).allowed===true, "fbk #"+(i+1));
a(checkRateLimitMemory(fbk,30,60000).allowed===false, "fbk 31st blocked");
_resetMemoryStore();
const erk = "te_" + Date.now();
for(let i=0;i<10;i++) a(checkRateLimitMemory(erk,10,60000).allowed===true, "er #"+(i+1));
a(checkRateLimitMemory(erk,10,60000).allowed===false, "er 11th blocked");

globalThis.fetch = origFetch;

console.log("");
console.log("Results: "+passed+" passed, "+failed+" failed");
process.exit(failed>0?1:0);

})();
