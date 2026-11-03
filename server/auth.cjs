function createAuthentication(verifyIdToken) {
  return async (req, res, next) => {
    const protectedRequest = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
      || /^\/my-(favorites|products|purchase)\/?$/i.test(req.path);
    const authorization = req.get('authorization');
    if (!authorization) {
      req.auth = null;
      if (protectedRequest) return res.status(401).json({ error: 'Authentication required' });
      return next();
    }
    const match = /^Bearer (\S+)$/.exec(authorization);
    if (!match) return res.status(401).json({ error: 'Invalid authorization' });
    try {
      req.auth = await verifyIdToken(match[1]);
      if (!req.auth.uid) throw new Error('Missing user identity');
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired authentication' });
    }
  };
}
function requireOwnUser(req, res, next) {
  if (!req.auth || req.params.uid !== req.auth.uid) return res.status(403).json({ error: 'Access denied' });
  next();
}
module.exports = { createAuthentication, requireOwnUser };
