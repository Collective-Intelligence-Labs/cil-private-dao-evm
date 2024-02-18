import { task, types } from "hardhat/config"

task("deploy", "Deploy a Feedback contract")
    .addOptionalParam("semaphore", "Semaphore contract address", undefined, types.string)
    .addOptionalParam("group", "Group id", "42", types.string)
    .addOptionalParam("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs, semaphore: semaphoreAddress, group: groupId }, { ethers, run }) => {
 
     
            const { semaphore,
                pairingAddress,
                semaphoreVerifierAddress,
                poseidonAddress,
                incrementalBinaryTreeAddress } = await run("deploy:semaphore", {
                logs
            })

            semaphoreAddress = semaphore.address
        

        if (!groupId) {
            groupId = process.env.GROUP_ID
        }

        const FeedbackFactory = await ethers.getContractFactory("Feedback")

        const feedbackContract = await FeedbackFactory.deploy(semaphoreAddress, groupId)

        await feedbackContract.deployed()

        if (logs) {
            console.info(`Feedback contract has been deployed to: ${feedbackContract.address}`)
        }

        const UnionsFactory = await ethers.getContractFactory("UnionsRegistry",{
            libraries: {
                IncrementalBinaryTree: incrementalBinaryTreeAddress
            }
        }
        )

        const unionsContract = await UnionsFactory.deploy(semaphoreVerifierAddress)

        await unionsContract.deployed();

        return feedbackContract
    })
