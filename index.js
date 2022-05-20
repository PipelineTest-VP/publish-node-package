const core = require('@actions/core');
const fs = require('fs');
const shell = require('shelljs');
const { Octokit } = require("@octokit/rest");

async function main() {
    try {
        const packageName = core.getInput('node-package-name');
        const packageVersion = core.getInput('node-package-version');
        const orgName = core.getInput('gthub-org-name');
        const gthubToken = core.getInput('gthub-token');
        const nodePackageRepoName = core.getInput('node-package-repo-name');

        // Logging the inputs
        core.info(`Package Name: ${packageName}`);
        core.info(`Package Version: ${packageVersion}`);
        core.info(`Gthub Org Name: ${orgName}`);
        core.info(`Node Package Repo Name: ${nodePackageRepoName}`);

        // check if package is already published
        const packageWithVersionExists = await checkIfPackageWithVersionExists(packageName, packageVersion, orgName, gthubToken);
        if(!packageWithVersionExists) {
            // download node package
            await shell.exec(`npm pack ${packageName}@${packageVersion}`);
            await shell.exec(`tar -xvf ${packageName}-${packageVersion}.tgz`);
            await shell.rm(`${packageName}-${packageVersion}.tgz`);
            await shell.mv('package', packageName);
            
            await shell.cd(packageName);
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
            
            core.info(`${packageName} published`);
            await shell.cd('..');
            await shell.rm('-rf', packageName);
        } else {
            core.info(`${packageName} already published`);
        }
        
    } catch (error) {
        core.setFailed("Package publish failed with error: ", error.message);
    }
}

async function checkIfPackageWithVersionExists(packageName, packageVersion, orgName, gthubToken) {
    try {
        const octokit = new Octokit({
            auth: gthubToken
        });

        const response = await octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
            package_type: 'npm',
            package_name: packageName,
            org: orgName
        });
        
        let isPackageFound = false;
        const packageVersions = response.data.length;
        for(let i = 0; i < packageVersions; i++) {
            if(response.data[i].name === packageVersion.toString()) {
                isPackageFound = true;
                break;
            }
        }
        console.log("IS_NODE_PACKAGE_FOUND: ", isPackageFound);
        
        return isPackageFound;
    } catch (error) {
        return false;
    }
}

main();