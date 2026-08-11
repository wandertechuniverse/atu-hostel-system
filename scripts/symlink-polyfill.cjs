const fs = require("fs");
const fsp = require("fs/promises");
const pathMod = require("path");

const origSync = fs.symlinkSync.bind(fs);
const origAsync = fsp.symlink.bind(fsp);
const origCb = fs.symlink.bind(fs);

function materialize(target, dest) {
  const absTarget = pathMod.isAbsolute(target)
    ? target
    : pathMod.resolve(pathMod.dirname(dest), target);
  fs.mkdirSync(pathMod.dirname(dest), { recursive: true });
  const st = fs.statSync(absTarget);
  if (st.isDirectory()) {
    fs.cpSync(absTarget, dest, { recursive: true, force: true });
  } else {
    fs.copyFileSync(absTarget, dest);
  }
}

fs.symlinkSync = function (target, dest, type) {
  try {
    return origSync(target, dest, type);
  } catch (e) {
    if (e && e.code === "EPERM") {
      materialize(target, dest);
      return;
    }
    throw e;
  }
};

fsp.symlink = async function (target, dest, type) {
  try {
    return await origAsync(target, dest, type);
  } catch (e) {
    if (e && e.code === "EPERM") {
      materialize(target, dest);
      return;
    }
    throw e;
  }
};

fs.symlink = function (target, dest, type, cb) {
  if (typeof type === "function") {
    cb = type;
    type = undefined;
  }
  try {
    fs.symlinkSync(target, dest, type);
    if (cb) process.nextTick(() => cb(null));
  } catch (e) {
    if (cb) process.nextTick(() => cb(e));
    else throw e;
  }
};

console.error("[symlink-polyfill] active");
