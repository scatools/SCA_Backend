const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
    credential: cert(process.env.FIREBASE_PRIVATE_KEY),
});

const defaultAuth = getAuth();

exports.returnError = (error, message) => {
    let stat = 'failure'
    if(error === false){
        stat = 'success'
    }
    return {status:stat, info:message}
}

exports.createUser = async (username, email, password)  => {
    try {
       const userRecord = await defaultAuth.createUser({
            email: email,
            emailVerified: false,
            password: password,
            displayName: username,
        })
        return this.returnError(false, userRecord.uid)
    } catch (error) {
        return this.returnError(true, error)
    }
}

exports.createToken = async (uid) => {
    try {
       const customToken = await defaultAuth.createCustomToken(uid)
       return this.returnError(false, customToken) 
    } catch (error) {
        return this.returnError(true, error)
    }
}

exports.verifyToken = async (token) => {
    try {
        const decodedToken = await defaultAuth.verifyIdToken(token)
        return this.returnError(false, decodedToken) 
    } catch (error) {
        return this.returnError(true, 'Token is faulty') 
    }
}

exports.updateInfo = async (uid, email) => {
    await defaultAuth.updateUser(uid, {
            email: email,
        } 
    )
    return 'success'
}

exports.updatePassword = async (uid, password) => {
    if(password.length < 6){
        return this.returnError(true, 'Password must be 6 characters long.')
    }
    await defaultAuth.updateUser(uid, {
        password: password
    })
    return this.returnError(false, 'success')
}

exports.disableAccount = async (uid) => {
    try {
        await defaultAuth.updateUser(uid, {
            disabled: true
        })
        return this.returnError(false, 'success')
    } catch (error) {
        return this.returnError(true, 'Failure to disable account')
    }
}

exports.importUser = async (email, password, uid) => {
    try {
        const results = await defaultAuth.importUsers(
            [
              {
                uid:uid,
                email: email,
                // Must be provided in a byte buffer.
                passwordHash: Buffer.from(password),
              },
            ],
            {
              hash: {
                algorithm: 'BCRYPT',
              },
            }
          )
            console.log(results.errors[0].error)
        results.errors.forEach((indexedError) => {
            return `Error importing user ${indexedError.index}`;
        });
    } catch (error) {
        return 'Error importing users :', error ;
    }
}