const { expect } = require("chai");
const { Contract, providers } = require("ethers");

describe("Voting contract", function () {
	let Voting;
	let hardhatVoting;
	let owner;
	let addr1;
	let addr2;
	let addr3;
	let addr4;
	let addrs;
  
	beforeEach(async function () {
	  // Get the ContractFactory and Signers here.
	  Voting = await ethers.getContractFactory("Voting");
	  [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
  
	  hardhatVoting = await Voting.deploy();
	});

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
		  expect(await hardhatVoting.owner()).to.equal(owner.address);
		});

	});

	describe("Functions", function () {
		it ("addCandidate()", async function() {
			//check that owner can add candidate
			await hardhatVoting.addCandidate(addr1.address);
            expect(await hardhatVoting.isCandidate(addr1.address)).to.equal(true);
			expect(await hardhatVoting.candidates(0)).to.equal(addr1.address);

			//check that only owner can add candidate
			await expect (hardhatVoting.connect(addr2).addCandidate(addr3.address)
				).to.be.revertedWith("Only owner can execute this command");

			//cannot add same candidate twice
			await expect(
				hardhatVoting.addCandidate(addr1.address)
				).to.be.revertedWith('Candidate can be registered only one time');

			// candidate cannot be added after the voting launch
			await hardhatVoting.launchVoting();
			expect(await hardhatVoting.hasLaunched()).to.equal(true);
			await expect(
					hardhatVoting.addCandidate(addr2.address)
			).to.be.revertedWith("Candidate cannot be added after the launch");
		});

		it("launchVoting", async function () {
			// campaign can be launched only when at least one candidate is registered
			await expect(
					hardhatVoting.launchVoting()
			).to.be.revertedWith("Campaign can be launched only when there is at least one registered candidate");

			await hardhatVoting.addCandidate(addr1.address);
			await hardhatVoting.launchVoting();
			//launchVoting indeed launches the voting campaign
			expect (await hardhatVoting.isVotingOpen()).to.equal("YES");

			//relaunch is not possible
			await expect(
					hardhatVoting.launchVoting()
			).to.be.revertedWith("Campaign can be launched only once");
		});

		it("vote()", async function () {
			// voting is not possible before voting is launched
			await hardhatVoting.addCandidate(addr1.address);
			await hardhatVoting.addCandidate(addr2.address);
			expect (await hardhatVoting.isVotingOpen()).to.equal("NO");
			await expect(hardhatVoting.vote(addr1.address)
			).to.be.revertedWith("can vote only when the voting is launched");

			//"You cannot vote after the VOTING_END_TIME"
			//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

			//voter can vote only once
			await hardhatVoting.launchVoting();
			await hardhatVoting.vote(0, {value: ethers.utils.parseEther("0.01")} );
			await expect(
					hardhatVoting.vote(1 , {value: ethers.utils.parseEther("0.01")})
			).to.be.revertedWith("Voter can vote only once");

			//candidates cannot participate to the voting
			await expect(
					hardhatVoting.connect(addr1).vote(addr2.address, {value: ethers.utils.parseEther("0.01")})
					).to.be.revertedWith("Candidates cannot participate to the voting");

			// address must be a valid address of a candidate
			await expect(
					hardhatVoting.connect(addr3).vote(addr4.address, {value: ethers.utils.parseEther("0.01")})
					).to.be.revertedWith('Provided ID must be within available once');

			// FEE must be of the specified value
			await expect(
					hardhatVoting.connect(addr3).vote(0, {value: ethers.utils.parseEther("0.4")})
					).to.be.revertedWith('Voter must contribute exactly 0.01 eth');
		});


		it("closeVoting", async function () {
			// cannot close the voting if it hasn't been launched
			await hardhatVoting.addCandidate(addr1.address);
			await expect(hardhatVoting.closeVoting()
				).to.be.revertedWith("can close only after the voting is launched");

			// check that the voting cannot be closed before the VOTING_END_DATE reached
			await hardhatVoting.launchVoting();
			await expect(
					hardhatVoting.closeVoting()
			).to.be.revertedWith("voting can be closed only after endDate");

			// check that voting closes after the VOTING_END_TIME is reached ?????????????????
			// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
			//await hardhatVoting.wait(5);
		});
	});		
});
