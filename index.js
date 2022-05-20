const core = require('@actions/core');
const fs = require('fs');
const shell = require('shelljs');

async function main() {
    try {
        const packageName = core.getInput('node-package-name');
        const packagePath = core.getInput('node-package-path');
        const orgName = core.getInput('gthub-org-name');
        const gthubToken = core.getInput('gthub-token');
        const nodePackageRepoName = core.getInput('node-package-repo-name');

        // Logging the inputs
        core.info(`Package Name: ${packageName}`);
        core.info(`Package Path: ${packagePath}`);
        core.info(`Gthub Org Name: ${orgName}`);
        core.info(`Node Package Repo Name: ${nodePackageRepoName}`);
        
        await shell.cd(packagePath);
        let nodePackageJson = JSON.parse(fs.readFileSync('./package.json'));
        nodePackageJson.name = "@" + orgName + "/" + packageName;
        nodePackageJson.publishConfig = {};
        nodePackageJson.publishConfig.registry = "https://npm.pkg.github.com";
        nodePackageJson.repository = `https://github.com/${orgName}/${nodePackageRepoName}`;

        fs.writeFileSync('./package.json', JSON.stringify(nodePackageJson, null, 2));
        fs.appendFileSync('./.npmrc', `//npm.pkg.github.com/:_authToken=${gthubToken}`);
        fs.appendFileSync('./.npmrc', '\n');
        fs.appendFileSync('./.npmrc', `@${orgName}:registry=https://npm.pkg.github.com`);
        await shell.exec(`npm publish`);
        
        console.log(`${packageName} published`);
    } catch (error) {
        core.setFailed("Package publish failed with error: ", error.message);
    }
}

main();