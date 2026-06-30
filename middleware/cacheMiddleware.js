export const cacheResponse = (seconds) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      // public - allows CDNs to cache it
      // s-maxage - time in seconds the CDN should cache it
      // max-age - time in seconds the browser should cache it
      // stale-while-revalidate - serve stale content while fetching fresh content in the background
      res.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=86400`);
    }
    next();
  };
};
