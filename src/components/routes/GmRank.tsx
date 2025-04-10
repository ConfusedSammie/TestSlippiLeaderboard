import { useEffect, useState } from "react";
import { rate, Rating, Options } from "openskill";

const ORDINAL_SCALING = 25;
const ORDINAL_OFFSET = 1100;
const TAU = 0.3;
const SLIPPI_API = "https://gql-gateway-dot-slippi.uc.r.appspot.com/graphql";

// Convert mu/sigma to ordinal rating
const slippiOrdinal = (r: Rating): number =>
  ORDINAL_SCALING * (r.mu - 3 * r.sigma) + ORDINAL_OFFSET;

// Try to extract opponent from URL hash
const getOpponentCodeFromQuery = (): string | null => {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("opponent");

  return raw ? decodeURIComponent(raw).toUpperCase() : null;
};


// Fetch Slippi player profile from API
const fetchSlippiProfile = async (code: string) => {
  const query = `
    query {
      getConnectCode(code: "${code.toUpperCase()}") {
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
  if (!user || !user.rankedNetplayProfile) {
    throw new Error(`Ranked profile not found for ${code}`);
  }

  const { ratingMu, ratingSigma, ratingOrdinal } = user.rankedNetplayProfile;




  return {
    mu: ratingMu,
    sigma: ratingSigma,
    ordinal: ratingOrdinal,
    name: user.displayName,
  };
};

export default function GmRank() {
  const [text, setText] = useState("Loading...");
  const [inputCode, setInputCode] = useState("");
  const [opponentCode, setOpponentCode] = useState<string | null>(null);

  const playerCode = "THEC#722"; // Your main player
  const options: Options = {
    tau: TAU,
    mu: 25,
    sigma: 25 / 3,
    limitSigma: true,
    preventSigmaIncrease: true,
  };
  const predict = async (code: string) => {
    try {
      setText("Calculating...");
      const [player, opponent] = await Promise.all([
        fetchSlippiProfile(playerCode),
        fetchSlippiProfile(code),
      ]);

      /*const [[win]] = rate([[{ mu: player.mu, sigma: player.sigma }], [{ mu: opponent.mu, sigma: opponent.sigma }]]);
      const [, [loss]] = rate([[{ mu: opponent.mu, sigma: opponent.sigma }], [{ mu: player.mu, sigma: player.sigma }]]);*/
      const [[win]] = rate(
        [[{ mu: player.mu, sigma: player.sigma }], [{ mu: opponent.mu, sigma: opponent.sigma }]],
        options
      );

      const [, [loss]] = rate(
        [[{ mu: opponent.mu, sigma: opponent.sigma }], [{ mu: player.mu, sigma: player.sigma }]],
        options
      );



      const currentOrdinal = player.ordinal;
      const winOrdinal = slippiOrdinal(win);
      const lossOrdinal = slippiOrdinal(loss);

      //const correctionFactor = 1.07;
      const deltaWin = (winOrdinal - currentOrdinal);
      const deltaLoss = (lossOrdinal - currentOrdinal);

      setText(`${opponent.name} (${opponent.ordinal.toFixed(1)}) | Win: +${deltaWin.toFixed(1)} | Loss: ${deltaLoss.toFixed(1)}`);

    } catch (err: any) {
      setText(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    const fromURL = getOpponentCodeFromQuery();
    if (fromURL) {
      setInputCode(fromURL);
      setOpponentCode(fromURL);
      predict(fromURL);
    }
  }, []);
  

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", fontSize: "1.3rem", textAlign: "center" }}>
      <h2>Slippi Rating Predictor for The Crimson Slur</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Opponent Code:{" "}
          <input
            type="text"
            placeholder="e.g. CHIP#947"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            style={{ fontSize: "1rem", padding: "0.3rem", width: "200px" }}
          />
        </label>
        <button
          onClick={() => {
            if (inputCode.includes("#")) {
              setOpponentCode(inputCode);
              predict(inputCode);
            } else {
              setText("Enter a valid connect code like TAG#123");
            }
          }}
          style={{ marginLeft: "1rem", fontSize: "1rem", padding: "0.4rem 1rem" }}
        >
          Predict
        </button>
      </div>

      <div id='textReceived'>{text}</div>
    </div>
  );
}
