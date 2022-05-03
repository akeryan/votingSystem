require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require("dotenv").config();
require("./tasks/tasks.js");


/**
 * @type import('hardhat/config').HardhatUserConfig
 */

privateKey1 = process.env.ACCOUNT1;
rinkebyNetwork = process.env.RINKEBY_NETWORK;


module.exports = { 
	defaultNetwork: "hardhat",
	networks: {
		hardhat: {
		},
		rinkeby: {
			url: rinkebyNetwork,
			accounts: [ privateKey1 ]
		}
	},
	solidity: {
		version: "0.8.3",
		settings: {
			optimizer: {
				enabled: false,
				runs: 200
			}
		}
	},
	paths: {
		root: './',
		sources: './contracts',
		tests: './tests',
		cashe: './cache',
		artifacts: './artifacts',
		tasks: './tasks'
	},
	mocha: {
		timeout: 40000 
	}
};