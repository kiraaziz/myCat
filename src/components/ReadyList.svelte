<script>

    export let imageList = []
    
    import { createEventDispatcher } from "svelte"
    const dispatcher = createEventDispatcher()

    const sentSQL =(id)=>{
        dispatcher("deleleSQL", id)
    }

</script>

<div class="w-11/12 h-full overflow-y-auto flex flex-wrap p-3"> 
    {#each imageList as image, index}
    <div class="w-1/3 h-60 p-1 flex items-center justify-center">
        <div style={`background-image: url(${image.url});`} class="flex items-center justify-center flex-row image h-full w-full shadow-2xl border-red-400"> 
            <button on:click={()=>{sentSQL(image.url)}} class="bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center">
                <img class="h-7 w-7 " alt="loading" src="./assets/icons/trash.svg"/>
            </button>
        </div>
    </div>    
    {/each}
    {#if imageList.length === 0 } 
    <div class="h-full w-full flex items-center justify-center">
        <img class="h-60 w-60 " alt="loading" src="./assets/svg/error.svg"/>
    </div>
    {/if}
</div>