import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';
dotenv.config();

const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
});

export default async function runQuery({ query }) {
    return new Promise((resolve, reject) => {
        console.log('Connecting to Snowflake...');
        connection.connect((err, conn) => {
            if (err) {
                console.error('Connection Error:', err);
                return reject(err);
            }
            console.log('Executing Query:', query);
            connection.execute({
                sqlText: query,
                complete: (err, stmt, rows) => {
                    if (err) {
                        console.error('Query Execution Error:', err);
                        return reject(err);
                    }
                    console.log('Query Results:', rows);
                    resolve(rows);
                    connection.destroy();
                },
            });
        });
    });
}

// Test the function if run directly
if (process.argv[1].endsWith('runQuery.js')) {
    runQuery({ query: 'SELECT current_date' })
        .then(result => console.log('Query result:', result))
        .catch(error => console.error('Error executing query:', error));
}
