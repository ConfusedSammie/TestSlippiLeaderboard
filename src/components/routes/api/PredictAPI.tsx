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
  const isPlainText = params.get("format") === "txt";
  const playerCode = "THEC#722";

  const [output, setOutput] = useState<string>("Loading...");

  useEffect(() => {
    if (!opponentCode) {
      setOutput("Missing opponent code.");
      return;
    }

    const fetchAndPredict = async () => {
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

        const winDelta = (slippiOrdinal(win) - player.ordinal).toFixed(1);
        const lossDelta = (slippiOrdinal(loss) - player.ordinal).toFixed(1);

        if (isPlainText) {
          const msg = `${opponent.name} | Win: +${winDelta} | Loss: ${lossDelta}`;
          document.head.innerHTML = ''; // strip react headers
          const meta = document.createElement("meta");
          meta.httpEquiv = "Content-Type";
          meta.content = "text/plain; charset=utf-8";
          document.head.appendChild(meta);
          setOutput(msg);
        } else {
          setOutput(JSON.stringify({
            opponent: opponent.name,
            win: winDelta,
            loss: lossDelta,
          }, null, 2));
        }
      } catch (err: any) {
        setOutput(`Error: ${err.message}`);
      }
    };

    fetchAndPredict();
  }, [opponentCode, isPlainText]);

  return <pre>{output}</pre>;
}
