const { Client } = require('pg');

async function test(password) {
    const connStr = `postgresql://neondb_owner:${password}@ep-small-wind-aovkqpej.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`;
    const client = new Client({ connectionString: connStr });
    try {
        await client.connect();
        console.log(`Success with password: ${password}`);
        await client.end();
        return true;
    } catch (e) {
        console.log(`Failed with password: ${password} - ${e.message}`);
        return false;
    }
}

async function main() {
    await test("IAmDev@08");
    await test("IAmDev%4008");
    await test(encodeURIComponent("IAmDev@08"));
}

main();
