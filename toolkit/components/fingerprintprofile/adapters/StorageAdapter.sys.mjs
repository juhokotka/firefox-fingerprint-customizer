/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const PROFILE_DIR = "ProfD";
const SUB_DIR = "fingerprint-profiles";

async function getProfilePath(userContextId) {
  let dir = PathUtils.join(
    Services.dirsvc.get(PROFILE_DIR, Ci.nsIFile).path,
    SUB_DIR
  );
  await IOUtils.makeDirectory(dir, { createAncestors: true, ignoreExisting: true });
  return PathUtils.join(dir, `${userContextId}.json`);
}

/**
 * Thin adapter that wraps IOUtils for persisting fingerprint profiles to disk.
 * FingerprintProfileStore depends only on this interface.
 */
export const StorageAdapter = {
  async read(userContextId) {
    let path = await getProfilePath(userContextId);
    if (!(await IOUtils.exists(path))) {
      return null;
    }
    return IOUtils.readJSON(path);
  },

  async write(userContextId, json) {
    let path = await getProfilePath(userContextId);
    await IOUtils.writeJSON(path, json);
  },

  async remove(userContextId) {
    let path = await getProfilePath(userContextId);
    if (await IOUtils.exists(path)) {
      await IOUtils.remove(path);
    }
  },

  async exists(userContextId) {
    let path = await getProfilePath(userContextId);
    return IOUtils.exists(path);
  },
};
