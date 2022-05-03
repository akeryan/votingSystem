//---------------------TASKS------------------------------

task("addVoting", "Deploys new Voting contract to the testnet")
	.addParam("address", "VotingFactory address")
	.setAction(async (taskArgs) => {		
		const factory = await ethers.getContractAt("VotingFactory", taskArgs.address);
		await factory.createVoting()
		const votings = await factory.getDeployedVotings();
		const voting = votings[votings.length - 1];
		console.log("Voting address: ", voting);
});

task("addCandidate", "add candidate by passing the address")
	.addParam("votingContract", "address of the Voting contract")
	.addParam("name", "name of the candidate")
	.addParam("candidate", "address of the candidate")
	.setAction(async (taskArgs) => {
		const voting = await ethers.getContractAt("Voting", taskArgs.votingaddr);
		await voting.addCandidate(taskArgs.name, taskArgs.candidate);
		console.log("added candidate: ", await voting.candidates(0));
});

task("startVoting", "Makes the voting campaign open for the voting")
	.addParam("address", "address of the Voting contract; available only to the owner")
	.setAction(async (taskArgs) => {
		const voting = await ethers.getContractAt("Voting", taskArgs.address);
		await voting.startVoting();
});

task("vote", "vot for the candidate")
	.addParam("address", "address of the Voting address")
	.addParam("id", "candidate id")
	.setAction(async (taskArgs) => {
		const voting = await ethers.getContractAt("Voting", taskArgs.address);
		const FEE = ethers.utils.parseEther("0.01");
		await voting.vote(taskArgs.id, {value: FEE});
});

task("closeVoting", "closes voting")
	.addParam("address", "address of the Voting address")
	.setAction(async (taskArgs) => {
		const voting = await ethers.getContractAt("Voting", taskArgs.address);
		await voting.closeVoting();
});

task("takeCommission", "owner can take commission")
	.addParam("address", "address of the Voting address")
	.addParam("amount", "amount in wei's")
	.setAction(async (taskArgs) => {
		const voting = await ethers.getContractAt("Voting", taskArgs.address);
		await voting.takeCommission(taskArgs.amount);
});

task("winnerTillNow", "returns the leader of the voting as of now")
	.addParam("address", "address of the Voting address")
	.setAction(async (taskArgs) => {
		const voting = await ethers.getContractAt("Voting", taskArgs.address);
		const winner = await voting.winnerTillNow();
		console.log("Winner as of now: ", winner);
});












