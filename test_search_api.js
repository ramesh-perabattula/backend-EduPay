const axios = require('axios');

const run = async () => {
    try {
        // Search Exact
        const res1 = await axios.get('http://localhost:5001/api/admin/students/search?query=12345TEST');
        console.log('Search Exact: Found', res1.data.usn);

        // Search Partial
        const res2 = await axios.get('http://localhost:5001/api/admin/students/search?query=12345');
        console.log('Search Partial: Found', res2.data.usn);

        // Search invalid
        try {
            await axios.get('http://localhost:5001/api/admin/students/search?query=INVALID');
        } catch (e) {
            console.log('Search Invalid: Status', e.response.status);
        }

    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) console.log(error.response.data);
    }
};

run();
