import { RateLimiter } from "limiter"
export const getPlayerData = async (connectCode: string) => {
  const query = `
    query {
      getConnectCode(code: "${connectCode.toUpperCase()}") {
        user {
         fbUid
          displayName
          connectCode {
             code
           }
        status
        activeSubscription {
            level
            hasGiftSub
        }
        rankedNetplayProfile {
            id
            ratingOrdinal
            ratingUpdateCount
            wins
            losses
            dailyGlobalPlacement
            dailyRegionalPlacement
           continent
           characters {
              character
                gameCount
            }
        }
            
}}}`;

  const req = await fetch('https://gql-gateway-dot-slippi.uc.r.appspot.com/graphql', {
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query }),
    method: 'POST',
  });

  const json = await req.json();
  return json;
};


const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 'second' })

export const getPlayerDataThrottled = async (connectCode: string) => {
  const remainingRequests = await limiter.removeTokens(1);
  return getPlayerData(connectCode)
}