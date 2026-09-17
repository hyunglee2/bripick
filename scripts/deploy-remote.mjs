import { Client } from "ssh2";

const archivePath = process.argv[2];
const password = process.env.BRIPICK_DEPLOY_PASSWORD;

if (!archivePath || !password) {
  console.error("Deployment archive or password is missing.");
  process.exit(1);
}

const remoteArchive = "/home/bobf/bripick-deploy.tar.gz";
const remoteScript = "/home/bobf/deploy-bripick.sh";
const expectedHostHash =
  "0c6aa8bc4fe8a5460e670a83433e1d8ccfb9fc2193f06e5a572948d9e4258982";

const connection = new Client();

function openSftp() {
  return new Promise((resolve, reject) => {
    connection.sftp((error, sftp) => (error ? reject(error) : resolve(sftp)));
  });
}

function upload(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (error) =>
      error ? reject(error) : resolve(),
    );
  });
}

function runDeployment() {
  return new Promise((resolve, reject) => {
    connection.exec(
      `sudo -S -p '' sh ${remoteScript}`,
      (error, stream) => {
        if (error) {
          reject(error);
          return;
        }

        let stderr = "";
        stream.on("data", (data) => process.stdout.write(data));
        stream.stderr.on("data", (data) => {
          stderr += data;
          process.stderr.write(data);
        });
        stream.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `Remote deployment exited with ${code}.`));
        });
        stream.write(`${password}\n`);
        stream.end();
      },
    );
  });
}

function removeRemoteFile(sftp, path) {
  return new Promise((resolve) => {
    sftp.unlink(path, () => resolve());
  });
}

connection
  .on("ready", async () => {
    const sftp = await openSftp();
    try {
      await upload(sftp, archivePath, remoteArchive);
      await upload(sftp, "scripts/deploy-bripick.sh", remoteScript);
      await runDeployment();
      await removeRemoteFile(sftp, remoteScript);
      connection.end();
    } catch (error) {
      await removeRemoteFile(sftp, remoteArchive);
      await removeRemoteFile(sftp, remoteScript);
      connection.end();
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  })
  .on("error", (error) => {
    console.error(`SSH connection failed: ${error.message}`);
    process.exitCode = 1;
  })
  .connect({
    host: "221.149.122.243",
    port: 2222,
    username: "bobf",
    password,
    hostHash: "sha256",
    hostVerifier: (hash) => hash === expectedHostHash,
    readyTimeout: 15000,
  });
