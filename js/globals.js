var BoA = {
    Global: {
        ApiUri: 'http://uri-to-boa-site/api',
        Searchers: [
            {
                Name: 'General',
                Catalogues: [
                    { name: 'Banco principal', key: 'banco-principal'}
                ]
            },
            {
                Name: 'VideoAudioPDF',
                Catalogues: [
                    { name: 'Banco principal', key: 'banco-principal'}
                ],
                Filters: [
                    { meta: 'metadata.technical.format', value: ['video', 'audio', 'pdf'] }
                ]
            }
        ]
    }
}
