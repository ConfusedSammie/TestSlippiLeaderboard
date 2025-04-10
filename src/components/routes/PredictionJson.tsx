import React from 'react';

export default function PredictionJson() {
  const params = new URLSearchParams(window.location.search);
  const opponent = params.get('opponent') || 'UNKNOWN';

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/GmRank?opponent=' + encodeURIComponent(opponent));
        const html = await res.text();
        const div = document.createElement('div');
        div.innerHTML = html;
        const extracted = div.querySelector('#textReceived')?.textContent;
        setData({ opponent, result: extracted || "N/A" });
      } catch (err) {
        setData({ opponent, result: "Error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [opponent]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
