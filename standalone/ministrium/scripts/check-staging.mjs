import {stagingReadiness} from '../server/deployment-config.mjs';
try{
 const result=stagingReadiness(process.env);
 if(!result.ready){console.error('Ministrium staging is not configured. Missing variable names:');for(const key of result.missing)console.error(`- ${key}`);process.exitCode=1;}
 else console.log('Ministrium staging configuration is complete. This check does not create resources or verify cloud connectivity.');
}catch(error){console.error(error.message);process.exitCode=1;}
