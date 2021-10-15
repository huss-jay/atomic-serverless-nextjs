/**
 * prints the custom header `x-tf-next-abc`
 */

export default function handler(req, res) {
  const headerValue = req.headers['x-tf-next-abc'];
  res.setHeader('Cache-Control', 'no-cache');
  res.end(`x-tf-next-abc: ${headerValue}`);
}
