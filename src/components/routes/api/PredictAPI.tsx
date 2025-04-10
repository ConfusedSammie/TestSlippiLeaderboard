import React, { useEffect, useState } from "react";
import { rate, Options } from "openskill";

const SLIPPI_API = "https://gql-gateway-dot-slippi.uc.r.appspot.com/graphql";

const fetchSlippiProfile = async (code: string) => {
  const query = `
    query {
      getConnectCode(code: "${code}") {
        user {
          displayName
          rankedNetplayProfile {
            ratingMu
            ratingSigma
            ratingOrdinal
          }
        }
      }
    }`;
  const res = await fetch(SLIPPI_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  const user = json?.data?.getConnectCode?.user;
  if (!user || !user.rankedNetplayProfile) throw new Error("Missing profile");
  const { ratingMu, ratingSigma, ratingOrdinal } = user.rankedNetplayProfile;
  return {
    name: user.displayName,
    mu: ratingMu,
    sigma: ratingSigma,
    ordinal: ratingOrdinal,
  };
};

const slippiOrdinal = (r: any) =>
  25 * (r.mu - 3 * r.sigma) + 1100;

const options: Options = {
  tau: 0.3,
  mu: 25,
  sigma: 25 / 3,
  limitSigma: true,
  preventSigmaIncrease: true,
};

export default function PredictAPI() {
  const params = new URLSearchParams(window.location.search);
  const opponentCode = decodeURIComponent(params.get("opponent") || "");
  const playerCode = "THEC#722"; // or load dynamically

  const [json, setJson] = useState<any>(null);

  useEffect(() => {
    const typeTag = document.createElement("meta");
    typeTag.httpEquiv = "Content-Type";
    typeTag.content = "application/json; charset=utf-8";
    document.head.appendChild(typeTag);
    const getPrediction = async () => {
      try {
        const [player, opponent] = await Promise.all([
          fetchSlippiProfile(playerCode),
          fetchSlippiProfile(opponentCode),
        ]);
        const [[win]] = rate(
          [[{ mu: player.mu, sigma: player.sigma }], [{ mu: opponent.mu, sigma: opponent.sigma }]],
          options
        );
        const [, [loss]] = rate(
          [[{ mu: opponent.mu, sigma: opponent.sigma }], [{ mu: player.mu, sigma: player.sigma }]],
          options
        );
        setJson({
          opponent: opponent.name,
          current: player.ordinal.toFixed(1),
          win: (slippiOrdinal(win) - player.ordinal).toFixed(1),
          loss: (slippiOrdinal(loss) - player.ordinal).toFixed(1),
        });
      } catch (e) {
        setJson({ error: (e as Error).message });
      }
    };

    getPrediction();
  }, [opponentCode]);

  if (!json) return <div>Loading...</div>;

  const isPlainText = params.get("format") === "txt";
  
  if (isPlainText) {
    // Set the document to mimic a plain text response
    useEffect(() => {
      const typeTag = document.createElement("meta");
      typeTag.httpEquiv = "Content-Type";
      typeTag.content = "text/plain; charset=utf-8";
      document.head.appendChild(typeTag);
    }, []);
  
    if (json.error) {
      return <>{json.error}</>;
    }
  
    return (
      <>
        {`${json.opponent} | Win: +${json.win} | Loss: ${json.loss}`}
      </>
    );
  }
  
  return (
    <pre>{JSON.stringify(json, null, 2)}</pre>
  );
  
}
