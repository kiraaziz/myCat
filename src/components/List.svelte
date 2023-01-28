<script>

    import { uid } from 'uid'
    import { createEventDispatcher } from "svelte"    

    const download = require('image-downloader')
    const path = require('path')
    const dispatcher = createEventDispatcher()

    export let imageList
    export let loading

    let onWait = []

    const sentSQL =(query)=>{
        dispatcher("sentSQL", query)
    }

    const upToCat =(table, image, index)=>{

        let query

        if(table === "Download"){

            onWait = [...onWait, index]

            let newName = `${uid(32)}.jpg`
            let options = {
                url: image.url,
                dest: path.join(`${__dirname}/../../../../../../public/download/${newName}`),              
            }

            query = `INSERT INTO '${table}' (url, height, width) VALUES ( './download/${newName}', '${image.height}', '${image.width}')`

            download.image(options)
                    .then(() => {
                        onWait = [...onWait.filter((val)=>{ val !== index })]
                        sentSQL(query)
                    })
                    .catch((err) => { 
                        alert(err)   
                        onWait = [...onWait.filter((val)=>{ val !== index })]
                    })
                
            } else {
                query = `INSERT INTO '${table}' (url, height, width) VALUES ( '${image.url}', '${image.height}', '${image.width}')`
                sentSQL(query)
            }  
        
    }

</script>
<div class="w-11/12 h-full overflow-y-auto flex flex-wrap p-3">
    {#if loading }
        <div class="h-full w-full flex items-center justify-center">
            <img class="h-60 w-60 " alt="loading" src="./assets/svg/loading.svg"/>
        </div>
    {/if}
    {#if imageList.length === 0 && !loading} 
    <div class="h-full w-full flex items-center justify-center">
        <img class="h-60 w-60 " alt="loading" src="./assets/svg/error.svg"/>
    </div>
    {/if}
    {#each imageList as image, index}
    <div class="w-1/3 h-60 p-1 flex items-center justify-center">
        <div style={`background-image: url(${image.url});`} class="flex items-center justify-center flex-row image h-full w-full shadow-2xl border-red-400">
            {#if !onWait.includes(index)}
                <button on:click={()=>{upToCat("Likes", image, index)}} class="bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center">
                    <img class="h-7 w-7 " alt="loading" src="./assets/icons/like.svg"/>
                </button>
                <button on:click={()=>{upToCat("Saved", image, index)}} class="bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center">
                    <img class="h-7 w-7 " alt="loading" src="./assets/icons/save.svg"/>
                </button>
                <button on:click={()=>{upToCat("Download", image, index)}} class="bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center">
                    <img class="h-7 w-7 " alt="loading" src="./assets/icons/download.svg"/>
                </button>
            {:else}
                <img class="h-10 w-10 border-2 border-red-500 bg-gray-900 p-1" alt="loading" src="./assets/svg/loading.svg"/>
            {/if}
        </div>
    </div>    
    {/each}
</div>
