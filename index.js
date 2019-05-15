require("dotenv").config();

const msRestAzure = require("ms-rest-azure");
const { ResourceManagementClient } = require("azure-arm-resource");
const fs = require("fs");
const path = require("path");
const url = require("url");
const _ = require("lodash");

// global.  its ok ... just for learning :)
let credentials;

// get via `az account list`
const subscriptionId = process.env.subscriptionId;

const log = s => {
  const outputString = typeof s === "string" ? s : JSON.stringify(s, null, 2);
  console.log(outputString);
};

const generateRandomId = prefix => {
  const self = generateRandomId;
  self.exsitIds = self.exsitIds || {};
  var randomId;
  while (true) {
    randomId = prefix + Math.floor(Math.random() * 10000);
    if (!self.exsitIds || !(randomId in self.exsitIds)) {
      break;
    }
  }
  self.exsitIds[randomId] = true;
  return randomId;
};

const getCredentials = async () => {
  const credentials = await msRestAzure.loginWithServicePrincipalSecret(
    process.env.clientId,
    process.env.secret,
    process.env.domain
  );
  return credentials;
};

const setCredentials = async () => {
  credentials = await getCredentials();
};

const getDefaultResourceManagementClient = async () => {
  const resourceManagementClient = new ResourceManagementClient(
    credentials,
    subscriptionId
  );
  return resourceManagementClient;
};

const resourceGroupExists = async resourceGroupName => {
  const client = await getDefaultResourceManagementClient();
  const exists = await client.resourceGroups.checkExistence(resourceGroupName);
  return exists;
};

const checkIfResourceGroupExists = async () => {
  const resourceGroupName = `cloud-shell-storage-eastus`;
  const exists = await resourceGroupExists(resourceGroupName);
  log(`resource group "${resourceGroupName}" exists: ${exists}`);
};

const createResourceGroup = async (
  name = "my-test-resource-group-01",
  location = "eastus"
) => {
  const client = await getDefaultResourceManagementClient();
  const resp = await client.resourceGroups.createOrUpdate(name, {
    location
  });
  return resp;
};

const deleteResourceGroup = async name => {
  const client = await getDefaultResourceManagementClient();
  const resp = await client.resourceGroups.deleteMethod(name);
  return resp;
};

const createThenDeleteResourceGroupExample = async () => {
  const resourceGroupName = generateRandomId("auto");
  log(`resourceGroupName=${resourceGroupName}`);
  await resourceGroupExists(resourceGroupName);
  await createResourceGroup(resourceGroupName);
  await deleteResourceGroup(resourceGroupName);
};

const deployArmTemplate = async (
  resourceGroupName,
  deploymentName,
  template,
  parameters,
  location = "eastus"
) => {
  const client = await getDefaultResourceManagementClient();
  const resp = await client.deployments.createOrUpdate(
    resourceGroupName,
    deploymentName,
    {
      /* location, */
      properties: {
        templateLink: {
          /* uri: `"${template}"` */
          uri: `https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/101-storage-account-create/azuredeploy.json`
        },
        parametersLink: {
          /* uri: `"${parameters}"` */
          uri: `https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/101-storage-account-create/azuredeploy.parameters.json`
        },
        mode: "Incremental" /* 'Complete' */,
        debugSetting: {
          /* permitted values are none,
           * requestContent, responseContent, or both requestContent and responseContent separated by a
           * comma */
          detailLevel: "requestContent,responseContent"
        }
      }
    }
  );

  // ** full example of params **
  // const resp = await client.deployments.createOrUpdate(
  //   resourceGroupName,
  //   deploymentName,
  //   {
  //     location,
  //     properties: {
  //       template: {},
  //       templateLink: {
  //         uri: ""
  //       },
  //       parameters: {},
  //       parametersLink: {
  //         uri: ""
  //       },
  //       mode: "Incremental" /* 'Complete' */,
  //       debugSetting: {
  //         /* permitted values are none,
  //          * requestContent, responseContent, or both requestContent and responseContent separated by a
  //          * comma */
  //         detailLevel: "requestContent,responseContent"
  //       }
  //     }
  //   }
  // );

  return resp;
};

const getArmTemplateFromDirectory = directoryPath => {
  return {
    template: url.pathToFileURL(`${directoryPath}/azuredeploy.json`),
    parameters: url.pathToFileURL(
      `${directoryPath}/azuredeploy.parameters.json`
    )
  };
  // return {
  //   template: fs.readFileSync(`${directoryPath}/azuredeploy.json`, {
  //     encoding: "utf8"
  //   }),
  //   parameters: fs.readFileSync(
  //     `${directoryPath}/azuredeploy.parameters.json`,
  //     { encoding: "utf8" }
  //   )
  // };
};

const deployArmTemplateExample = async () => {
  const directoryPath = path.join(
    __dirname,
    "arm-templates",
    "101-storage-account-create"
  );
  const armTemplate = getArmTemplateFromDirectory(directoryPath);
  const resourceGroupName = generateRandomId("resource-group-");
  await createResourceGroup(resourceGroupName);
  const deploymentName = generateRandomId(`${resourceGroupName}-deployment-`);
  const resp = await deployArmTemplate(
    resourceGroupName,
    deploymentName,
    armTemplate.template,
    armTemplate.parameters
  );
  log(resp);
};

const run = async () => {
  await setCredentials();
  // await createThenDeleteResourceGroupExample();
  await deployArmTemplateExample();
};

run();
