import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';
dotenv.config();

runQuery.spec = {
    name: 'runQuery',
    description: 'Executes a specified SQL query and returns the results.',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'SQL query to be executed',
            },
        },
        required: ['query'],
    },
};

export default async function runQuery({ query }) {
    const connection = snowflake.createConnection({
        account: process.env.SNOWFLAKE_ACCOUNT,
        username: process.env.SNOWFLAKE_USERNAME,
        password: process.env.SNOWFLAKE_PASSWORD,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE,
        database: process.env.SNOWFLAKE_DATABASE,
        schema: process.env.SNOWFLAKE_SCHEMA,
    });

    return new Promise((resolve, reject) => {
        console.log('Connecting to Snowflake...');
        connection.connect((err) => {
            if (err) {
                console.error('Connection Error:', err);
                return reject(err);
            }

            console.log('Connection established.');
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
