<script>

    import Screen from "./components/Screen.svelte"
    import Search from "./components/Search.svelte"
    import Main from "./components/Main.svelte"
    import Tab from "./components/Tab.svelte"
    import List from "./components/List.svelte"
    import ReadyList from "./components/ReadyList.svelte"
    
    const google = require("g-i-s")
    const sqlite3 = require('sqlite3').verbose()
    const catDB = new sqlite3.Database('./myDataBase/catDB.sql')
    
    let imageList = []

    let pageRout = "Home"
    let loading = false

    const loadImages =(imageName)=>{
       if(imageName){
            
            google(imageName, logResults)
            imageList = []
            loading = true

            function logResults(error, results) {
                if (error) {
                    console.log(error)
                }
                else {
                    imageList = results
                    console.log(results)
                }
                loading = false
            }

        } else {
            loading = false
            imageList = []
        }
    }

    const handleRout =(rout)=>{

        pageRout = rout
        imageList = []

        if(rout !== "Home"){
            catDB.serialize(async()=>{
                
                let query  = `SELECT * FROM '${pageRout}'`
                catDB.each(query, (err, data)=>{
                    if(!err){
                        imageList = [data, ...imageList]
                    }
                })
            })
        }

    }

</script>

<Screen>
    <Tab {pageRout} on:handleRout={(e)=>{handleRout(e.detail)}}/>
    <Main>
        {#if pageRout === "Home"}
            <Search on:rollUp={(e)=>{loadImages(e.detail)}}/>
            <List on:sentSQL={(e)=>{
                catDB.serialize(async()=>{
                    catDB.run(e.detail)
                })
            }} {loading} {imageList} />
        {:else} 
            <ReadyList {imageList} on:deleleSQL={(e)=>{

                let query = `DELETE FROM '${pageRout}' WHERE url = '${e.detail}'`
                catDB.serialize(async()=>{
                    catDB.run(query)
                })
                
                handleRout(pageRout)

            }} />
        {/if}
    </Main>
</Screen>