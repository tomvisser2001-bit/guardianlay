export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { url, email } = req.body;

    // Voor nu alleen test data teruggeven
    return res.status(200).json({
      ok: true,
      score: Math.floor(Math.random() * 100), // testscore 0–99
      report_url: `https://example.com/report/${encodeURIComponent(url)}`
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
