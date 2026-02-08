import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const lockPath = path.join(repoRoot, "package-lock.json");
const packageJsonPath = path.join(repoRoot, "package.json");
const csvOutputPath = path.join(repoRoot, "THIRD_PARTY_LICENSES.csv");
const noticesOutputPath = path.join(repoRoot, "THIRD_PARTY_NOTICES.md");

const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const rootDeps = new Set(Object.keys(packageJson.dependencies ?? {}));
const rootDevDeps = new Set(Object.keys(packageJson.devDependencies ?? {}));

const packages = lock.packages ?? {};

const LICENSE_CANDIDATES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "LICENCE.txt",
  "COPYING",
  "COPYING.md",
  "COPYING.txt",
];

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function extractNameFromPackagePath(packagePath) {
  const idx = packagePath.lastIndexOf("node_modules/");
  if (idx === -1) return "";
  return packagePath.slice(idx + "node_modules/".length);
}

function detectLicenseFile(packagePath) {
  const dir = path.join(repoRoot, packagePath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return "";
  const entries = new Set(fs.readdirSync(dir));

  for (const candidate of LICENSE_CANDIDATES) {
    if (entries.has(candidate)) {
      return path.posix.join(packagePath.replaceAll("\\", "/"), candidate);
    }
  }

  // Fallback for uncommon names like "License" etc.
  for (const fileName of entries) {
    if (/^(license|licence|copying)(\.|$)/i.test(fileName)) {
      return path.posix.join(packagePath.replaceAll("\\", "/"), fileName);
    }
  }

  return "";
}

function inferLicenseFromLicenseFile(licenseFilePath) {
  if (!licenseFilePath) return "";
  const absPath = path.join(repoRoot, licenseFilePath);
  if (!fs.existsSync(absPath)) return "";
  const text = fs.readFileSync(absPath, "utf8");
  const head = text.slice(0, 3000);

  if (/MIT License/i.test(head)) return "MIT";
  if (/Apache License[\s\S]*Version 2\.0/i.test(head)) return "Apache-2.0";
  if (/BSD 2-Clause|Redistribution and use in source and binary forms/i.test(head)) {
    if (/Neither the name/i.test(head)) return "BSD-3-Clause";
    return "BSD-2-Clause";
  }
  if (/ISC License/i.test(head)) return "ISC";
  if (/Creative Commons Attribution 4\.0/i.test(head)) return "CC-BY-4.0";
  return "";
}

const rows = [];
for (const [packagePath, metadata] of Object.entries(packages)) {
  if (!packagePath) continue; // Skip root entry ""
  if (!metadata || typeof metadata !== "object") continue;

  const name = extractNameFromPackagePath(packagePath);
  if (!name) continue;

  const version = metadata.version ?? "";
  const dev = Boolean(metadata.dev);
  const resolved = metadata.resolved ?? "";
  const licenseFile = detectLicenseFile(packagePath);
  const rawLicense = (metadata.license ?? "").trim();
  const inferred = inferLicenseFromLicenseFile(licenseFile);
  const license = rawLicense || inferred || "UNKNOWN";
  const licenseSource = rawLicense ? "package-lock" : inferred ? "license-file-inferred" : "unknown";

  const directDependency =
    packagePath === `node_modules/${name}` &&
    (rootDeps.has(name) || rootDevDeps.has(name));

  rows.push({
    name,
    version,
    license,
    licenseSource,
    directDependency,
    devDependency: dev,
    resolved,
    packagePath: packagePath.replaceAll("\\", "/"),
    licenseFile,
  });
}

rows.sort((a, b) => {
  if (a.name !== b.name) return a.name.localeCompare(b.name);
  if (a.version !== b.version) return a.version.localeCompare(b.version);
  return a.packagePath.localeCompare(b.packagePath);
});

const header = [
  "package",
  "version",
  "license",
  "license_source",
  "direct_dependency",
  "dev_dependency",
  "resolved",
  "package_path",
  "license_file",
];

const csvLines = [header.join(",")];
for (const row of rows) {
  csvLines.push(
    [
      row.name,
      row.version,
      row.license,
      row.licenseSource,
      row.directDependency,
      row.devDependency,
      row.resolved,
      row.packagePath,
      row.licenseFile,
    ]
      .map(csvEscape)
      .join(","),
  );
}

fs.writeFileSync(csvOutputPath, `${csvLines.join("\n")}\n`, "utf8");

const licenseCounts = new Map();
for (const row of rows) {
  licenseCounts.set(row.license, (licenseCounts.get(row.license) ?? 0) + 1);
}

const sortedLicenseCounts = [...licenseCounts.entries()].sort((a, b) => b[1] - a[1]);

const runtimeDirect = [];
for (const depName of Object.keys(packageJson.dependencies ?? {}).sort()) {
  const direct = rows.find(
    (r) => r.name === depName && r.packagePath === `node_modules/${depName}`,
  );
  runtimeDirect.push({
    name: depName,
    license: direct?.license ?? "UNKNOWN",
  });
}

const notableLicenses = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC-BY-4.0",
  "ISC",
  "UNKNOWN",
]);
const notablePackages = rows.filter((r) => notableLicenses.has(r.license));
notablePackages.sort((a, b) => {
  if (a.license !== b.license) return a.license.localeCompare(b.license);
  if (a.name !== b.name) return a.name.localeCompare(b.name);
  return a.version.localeCompare(b.version);
});

const generatedDate = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push("# Third-Party Notices");
lines.push("");
lines.push("このファイルは、`r3f-training` で利用している第三者ライブラリのライセンス情報をまとめたものです。");
lines.push("");
lines.push("## 重要事項");
lines.push("- 本リポジトリ内の自作部分には `LICENSE` が適用されます。");
lines.push("- 第三者ライブラリには、それぞれのライセンスが優先適用されます。");
lines.push("- 第三者ライブラリに付随する著作権表示・ライセンス文は、再配布時に保持してください。");
lines.push("");
lines.push("## 生成情報");
lines.push(`- 生成日: ${generatedDate}`);
lines.push("- 生成元: `package-lock.json`");
lines.push(`- 依存パッケージ数（root除く）: ${rows.length}`);
lines.push("");
lines.push("## 主要ランタイム依存関係（direct dependencies）");
for (const dep of runtimeDirect) {
  lines.push(`- \`${dep.name}\` - ${dep.license}`);
}
lines.push("");
lines.push("## ライセンス内訳（全依存）");
for (const [license, count] of sortedLicenseCounts) {
  lines.push(`- \`${license}\`: ${count}`);
}
lines.push("");
lines.push("## 特記事項");
lines.push("- `caniuse-lite` は `CC-BY-4.0` です。帰属表示など当該ライセンス条件に従ってください。");
lines.push("- `webgl-constants` は `package-lock.json` の `license` 欄が空ですが、同梱 `LICENSE` から MIT と判定しています。");
lines.push("- `THIRD_PARTY_LICENSES.csv` に全依存の明細（パッケージ名、バージョン、ライセンス、ライセンスファイル位置）を記録しています。");
lines.push("");
lines.push("## MIT以外/要確認ライセンスの一覧（全依存）");
for (const pkg of notablePackages) {
  lines.push(`- \`${pkg.name}@${pkg.version}\` - ${pkg.license}`);
}
lines.push("");
lines.push("## 再配布時の実務メモ");
lines.push("- 本リポジトリを配布する場合、`LICENSE` と `THIRD_PARTY_NOTICES.md` と `THIRD_PARTY_LICENSES.csv` を同梱してください。");
lines.push("- ビルド成果物を配布する場合、配布形態に応じて第三者ライセンス表示（少なくとも著作権表示と許諾文）を同梱してください。");

fs.writeFileSync(noticesOutputPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Generated ${path.basename(csvOutputPath)} (${rows.length} rows).`);
console.log(`Updated ${path.basename(noticesOutputPath)}.`);
