/**
 * Store new assets into IPFS.
 * Look for directories under `./assets`, only store assets without `uri` in `data/${network}/state.json` file.
 * Update `data/${network}/state.json` file after storage.
 */

import hardhat from "hardhat";
import fs from "fs";
import path from "path";

import { infuraIPFSId, infuraIPFSSecret } from "../.env.json";

async function main() {
  const network = hardhat.network.name;

  // get path to assets
  const assetsDirectory = path.join(__dirname, "..", "assets");

  // read current asset state or initialize
  const assetsStatePath = path.join(
    assetsDirectory,
    `data/${network}/state.json`
  );

  let assetsState: any;
  try {
    assetsState = import(assetsStatePath);
  } catch (err) {
    assetsState = {};
  }

  // find assets to be stored
  const assetPaths = fs
    .readdirSync(assetsDirectory, { withFileTypes: true })
    .filter((dirent) => {
      // filter out directories
      if (!dirent.isDirectory()) {
        return false;
      }

      // filter out assets that have not been stored
      if (assetsState[dirent.name] && assetsState[dirent.name].uri) {
        return false;
      }

      return true;
    })
    .map((dirent) => dirent.name);

  if (assetPaths.length > 0) {
    // store all new assets
    await Promise.all(
      assetPaths.map(async (asset) => {
        // asset directory
        const diretory = path.join(__dirname, "..", "assets/avatars", asset);

        // read in metadata
        const assetJson = import(path.join(diretory, "metadata.json"));

        // store on IPFS via client
        console.log(`Storing asset ${asset}...`);
        // @ts-ignore
        const { url } = await client.store({
          ...assetJson,
          image: new File(
            [await fs.promises.readFile(path.join(diretory, assetJson.image))],
            assetJson.image,
            { type: "image/jpg" }
          ),
        });

        // update avatar uri
        assetsState[asset] = { uri: url, ...assetsState[asset] };
      })
    );

    // write state to file
    console.log(`Writing state to ${assetsStatePath}...`);
    fs.writeFileSync(assetsStatePath, JSON.stringify(assetsState, null, 2));
    console.log("Done.");
  } else {
    console.log("No new asset to be stored, skipped.");
  }
}

main();
