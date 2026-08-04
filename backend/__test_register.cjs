const fightController = require('./src/controllers/fightController');

const makeRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
};

const makeReq = (body) => ({
  user: { id: 1, role: 'supervisor' },
  params: { id: '9' },
  body,
});

(async () => {
  const test = async (label, body) => {
    const res = makeRes();
    const next = (err) => {
      console.log(label, '-> NEXT(err):', err && err.message, '| code:', err && err.code, '| status:', err && err.status);
      console.log('   STACK:', err && err.stack.split('\n').slice(0, 5).join('\n'));
    };
    await fightController.registerResult(makeReq(body), res, next);
    if (res.statusCode) {
      console.log(label, '-> RESPONSE:', res.statusCode, JSON.stringify(res.body));
    }
  };

  await test('KO round 12', { result_type: 'ko', winner: 'Miguel Angel Ruiz', round: 12, time: '2:35' });
  await test('KO round 0', { result_type: 'ko', winner: 'Miguel Angel Ruiz', round: 0, time: '2:35' });
  await test('Decision no round', { result_type: 'decision', winner: 'Miguel Angel Ruiz' });
})();
