<script>

    import { createEventDispatcher } from "svelte"
    const dispatcher = createEventDispatcher()

    const handleRout =(rout)=>{
        dispatcher("handleRout", rout)
    }

    export let pageRout

    const routersName = [
                        {name: "Home", img: "cat.svg"},
                        {name: "Likes", img: "like.svg"},
                        {name: "Saved", img: "save.svg"},
                        {name: "Download", img: "download.svg"}
                        ]

</script>
<div class="w-20 h-full flex items-center justify-center bg-red-400 flex items-center justify-center flex-col">
    {#each routersName as rout}
        <button class={`opacity-${pageRout === rout.name ? "100" : "70"} hover:opacity-100 flex items-center justify-center flex-col h-12 w-12 m-2 `} on:click={()=>{handleRout(rout.name)}}>
            <img src={`./assets/navIcon/${rout.img}`} class="h-10 w-10" alt="like" />
            {#if pageRout === rout.name}
                <div class="h-2 w-1/3 bg-gray-900 rounded-full"></div>
            {/if}
        </button>
    {/each}
</div>
