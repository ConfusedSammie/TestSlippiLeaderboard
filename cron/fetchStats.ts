import { GoogleSpreadsheet } from 'google-spreadsheet';
import creds from '../secrets/creds.json';
import * as syncFs from 'fs';
import * as path from 'path';
import util from 'util';
import * as settings from '../settings';
import { exec } from 'child_process';
import { RateLimiter } from 'limiter';

const fs = syncFs.promises;
const execPromise = util.promisify(exec);
const SLIPPI_API = 'https://internal.slippi.gg/';

// --- GET CONNECT CODES FROM GOOGLE SHEET ---
const getPlayerConnectCodes = async (): Promise<string[]> => {
  const doc = new GoogleSpreadsheet(settings.spreadsheetID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = (await sheet.getRows()).slice(1);
  return [...new Set(rows.map(r => r._rawData[1]).filter(r => r !== ''))] as string[];
};

// --- SLIPPI PROFILE FETCH ---
export const getPlayerData = async (connectCode: string) => {
  const tag = connectCode.toUpperCase();
  console.log(`[fetch] Fetching for ${tag}`);

  const query = `
    fragment profileFields on NetplayProfile {
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

    fragment userProfilePage on User {
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
        ...profileFields
      }
    }

    query UserProfilePageQuery($cc: String, $uid: String) {
      getUser(fbUid: $uid, connectCode: $cc) {
        ...userProfilePage
      }
    }
  `;

  const response = await fetch(SLIPPI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'UserProfilePageQuery',
      query,
      variables: { cc: tag, uid: tag },
    }),
  });

  const text = await response.text();

  try {
    const json = JSON.parse(text);
    console.log(`[fetch] Success for ${tag}`);
    return json;
  } catch (err) {
    console.error(`[fetch] JSON parse error for ${tag}`);
    console.error(text.slice(0, 500));
    return new Error(`Invalid JSON for ${tag}`);
  }
};

// --- RATE LIMITER ---
const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 'second' });

export const getPlayerDataThrottled = async (connectCode: string) => {
  await limiter.removeTokens(1);
  return getPlayerData(connectCode);
};

// --- MAIN PLAYER FETCH LOGIC ---
const getPlayers = async () => {
  console.log('Date logged = ' + new Date());
  const codes = await getPlayerConnectCodes();
  console.log(`Found ${codes.length} player codes`);

  const allData = codes.map(code => getPlayerDataThrottled(code));
  const results = await Promise.all(
    allData.map((p, i) =>
      p.catch(e => {
        console.error(`❌ Error fetching player at index ${i}:`, e);
        return e;
      })
    )
  );

  const validResults = results.filter(result => !(result instanceof Error));
  console.log(`[debug] Raw valid results:`);
  validResults.forEach((r, i) => {
    console.log(`Result ${i}:`, JSON.stringify(r, null, 2).slice(0, 300));
  });

  const users = validResults
    .map((data: any) => data?.data?.getUser)
    .filter(Boolean);

  users.forEach(u => {
    if (!u.rankedNetplayProfile) {
      console.warn(`No ranked profile for ${u.displayName || 'Unknown user'}`);
    }
  });

  const rankedUsers = users.filter(
    u =>
      u.rankedNetplayProfile &&
      typeof u.rankedNetplayProfile.ratingOrdinal === 'number'
  );

  console.log(`${results.length} results total`);
  console.log(`${validResults.length} successful results`);
  console.log(`${users.length} valid user objects`);
  console.log(`${rankedUsers.length} users with ranked profiles`);

  return rankedUsers.sort(
    (p1, p2) =>
      p2.rankedNetplayProfile.ratingOrdinal -
      p1.rankedNetplayProfile.ratingOrdinal
  );
};

// --- MAIN ENTRY ---
async function main() {
  console.log('Starting player fetch.');
  const players = await getPlayers();
  if (!players.length) {
    console.log('Error fetching player data. Terminating.');
    return;
  }

  console.log('Player fetch complete.');

  const newFile = path.join(__dirname, 'data/players-new.json');
  const oldFile = path.join(__dirname, 'data/players-old.json');
  const timestamp = path.join(__dirname, 'data/timestamp.json');

  try {
    await fs.rename(newFile, oldFile);
    console.log('Renamed existing data file.');
  } catch (err) {
    console.warn('Old data file not found, skipping rename.');
  }

  await fs.writeFile(newFile, JSON.stringify(players, null, 2));
  await fs.writeFile(timestamp, JSON.stringify({ updated: Date.now() }));
  console.log('Wrote new data file and timestamp.');

  const rootDir = path.normalize(path.join(__dirname, '..'));
  const { stdout, stderr } = await execPromise(`git -C ${rootDir} status --porcelain`);
  if (stdout || stderr) {
    console.log('Pending git changes... aborting deploy');
    return;
  }

  console.log('Deploying.');
  const { stdout: deployOut, stderr: deployErr } = await execPromise(
    `npm run --prefix ${rootDir} deploy`
  );
  console.log(deployOut);
  if (deployErr) console.error(deployErr);
  console.log('Deploy complete.');
}

main();
