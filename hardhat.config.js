require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');

const RINKEBY_PRIVATE_KEY = '3a5ce01b9fa0d000f4c75d659dae422e66df10bc4d404d53b09f5aa2d0519dbe';
const RINKEBY_URL = "https://rinkeby.infura.io/v3/7b7e6f532f1945ab96bb9c7626eed67ci";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.3",
	networks: {
		rinkeby: {
			url: 'https://rinkeby.infura.io/v3/7b7e6f532f1945ab96bb9c7626eed67c', //Infura url with projectId
			accounts: ['3a5ce01b9fa0d000f4c75d659dae422e66df10bc4d404d53b09f5aa2d0519dbe'] //add the account that will deploy the contract key (private key)
		},
	}
};


